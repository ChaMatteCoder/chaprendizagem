#!/usr/bin/env python3
"""Validate the stage-01 specification; this does not load or train a GAN."""

from copy import deepcopy
import json
import math
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[2]


def read(path):
    def reject_constant(value):
        raise ValueError(f"Non-finite JSON constant: {value}")
    return json.loads(path.read_text(), parse_constant=reject_constant)


SCHEMA = read(ROOT / "contracts/schema.v1.json")
Draft202012Validator.check_schema(SCHEMA)
KINDS = [item["$ref"].rsplit("/", 1)[1] for item in SCHEMA["oneOf"]]
VALIDATORS = {
    kind: Draft202012Validator(
        {"$schema": SCHEMA["$schema"], "$ref": f"#/$defs/{kind}", "$defs": SCHEMA["$defs"]},
        format_checker=FormatChecker(),
    )
    for kind in KINDS
}
EXPERIENCE = read(ROOT / "experience.v1.json")
MISSION_IDS = {mission["id"] for mission in EXPERIENCE["missions"]}


def walk(value):
    if isinstance(value, dict):
        yield value
        for nested in value.values():
            yield from walk(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from walk(nested)


def validate_bundle(bundle, require_recorded=False, weight_links=None):
    """`weight_links` maps an exported file hash (e.g. ONNX) to the registered checkpoint
    weight hash it was produced from. It must come from a verified export record
    (stage 04: onnx-export.json); without it, manifest and checkpoint hashes must be equal."""
    weight_links = weight_links or {}
    errors = []
    records = bundle.get("records", [])
    if not records:
        return ["Bundle must contain records."]
    for index, record in enumerate(records):
        kind = record.get("kind")
        if kind not in VALIDATORS:
            errors.append(f"record {index}: unknown kind {kind}")
            continue
        for error in VALIDATORS[kind].iter_errors(record):
            errors.append(f"{kind} {index} /{'/'.join(map(str, error.absolute_path))}: {error.message}")
    if errors:
        return errors
    if len({record["dataMode"] for record in records}) != 1:
        errors.append("A bundle cannot mix fixture and recorded data.")

    registry = {}
    for record in records:
        if "id" in record:
            key = (record["kind"], record["id"])
            if key in registry:
                errors.append(f"Duplicate identifier: {key}")
            registry[key] = record

    def check(condition, message):
        if not condition:
            errors.append(message)

    def resolve(kind, identifier):
        value = registry.get((kind, identifier))
        check(value is not None, f"Missing {kind}: {identifier}")
        return value

    manifests = {record["runId"]: record for record in records if record["kind"] == "model-manifest"}
    split_by_dataset = {record["datasetId"]: record for record in records if record["kind"] == "dataset-split"}

    def check_latent(latent, manifest=None):
        check(len(latent["values"]) == latent["dimension"], "Latent vector length differs from declared dimension.")
        if manifest:
            for field in ["dimension", "distribution", "rngId"]:
                check(latent[field] == manifest["latent"][field], f"Latent {field} differs from manifest.")

    def check_prediction(prediction):
        if prediction["status"] != "ready":
            return
        checkpoint = resolve("checkpoint", prediction["checkpointId"])
        if checkpoint:
            check(checkpoint["runId"] == prediction["runId"], "Discriminator/checkpoint run mismatch.")
        logit = prediction["logit"]
        score = 1 / (1 + math.exp(-logit)) if logit >= 0 else math.exp(logit) / (1 + math.exp(logit))
        check(abs(score - prediction["score"]) <= 1e-6, "Discriminator score is not sigmoid(logit).")
        expected = "real" if prediction["score"] >= prediction["threshold"] else "synthetic"
        check(prediction["predictedOrigin"] == expected, "Discriminator threshold/prediction mismatch.")

    def check_answer(answer):
        sample = resolve("sample", answer["sampleId"])
        if sample:
            check(answer["provenance"] == sample["provenance"], "Reveal provenance differs from registered sample.")
            origin = sample["provenance"]["origin"]
            correct = answer["playerChoice"] == origin
            check(answer["correctOrigin"] == origin, "Answer key differs from sample provenance.")
            check(answer["correct"] == correct, "Correctness differs from recorded origin.")
            check(answer["points"] == (100 if correct else 0), "Points differ from the human answer.")
        check_prediction(answer["discriminator"])

    for record in records:
        kind = record["kind"]
        mode = record["dataMode"]
        check(not require_recorded or mode == "recorded", "Fixture cannot enter a recorded-results channel.")
        for node in walk(record):
            if "dataMode" in node:
                check(node["dataMode"] == mode, "Mixed data modes in one record.")
            if "path" in node:
                check(not any(part in (".", "..") for part in node["path"].split("/")), "Artifact path traversal is forbidden.")
            if mode == "recorded":
                for name, value in node.items():
                    if name.lower().endswith("sha256"):
                        check(value != "0" * 64, "Placeholder hash cannot enter recorded artifacts.")
                if "path" in node:
                    check(not node["path"].startswith("fixtures/"), "Fixture path cannot enter recorded artifacts.")

        if kind == "model-manifest":
            dim = record["latent"]["dimension"]
            expected = [("generator", "input", ["N", dim, 1, 1]), ("generator", "output", ["N", 1, 28, 28]), ("discriminator", "input", ["N", 1, 28, 28]), ("discriminator", "output", ["N", 1])]
            for network, direction, shape in expected:
                check(record[network][direction]["shape"] == shape, f"Invalid {network} {direction} shape.")
            active = resolve("checkpoint", record["activeCheckpointId"])
            if active:
                check(active["runId"] == record["runId"], "Active checkpoint belongs to another run.")
                for network in ["generator", "discriminator"]:
                    published = record[network]["asset"]["sha256"]
                    check(active[network]["sha256"] in (published, weight_links.get(published)), "Active checkpoint/model hash mismatch.")
            fixed = resolve("latent-set", record["fixedLatentSetId"])
            if fixed:
                check(fixed["dimension"] == dim, "Fixed latent dimension differs from manifest.")
                check(fixed["distribution"] == record["latent"]["distribution"] and fixed["rngId"] == record["latent"]["rngId"], "Fixed latent generation differs from manifest.")

        elif kind == "dataset-split":
            seen = set()
            for name, identifiers in record["partitions"].items():
                check(not seen.intersection(identifiers), f"Dataset partitions overlap at {name}.")
                seen.update(identifiers)

        elif kind == "sample":
            source = record["provenance"]
            if source["origin"] == "synthetic":
                manifest = manifests.get(source["runId"])
                check(manifest is not None, "Synthetic sample has no run manifest.")
                check_latent(source["latent"], manifest)
                checkpoint = resolve("checkpoint", source["checkpointId"])
                if checkpoint:
                    check(checkpoint["runId"] == source["runId"], "Sample/checkpoint run mismatch.")
                    check(checkpoint["generator"]["sha256"] == source["generatorSha256"], "Sample generator hash mismatch.")
            else:
                split = split_by_dataset.get(source["datasetId"])
                check(split is not None, "Real sample has no dataset split.")
                if split:
                    check(source["recordId"] in split["partitions"][source["partition"]], "Real sample is outside its declared partition.")

        elif kind == "latent-set":
            check(all(len(vector) == record["dimension"] for vector in record["vectors"]), "Fixed latent vector length mismatch.")

        elif kind == "checkpoint":
            fixed = resolve("latent-set", record["fixedLatentSetId"])
            check(record["runId"] in manifests, "Checkpoint has no run manifest.")
            if fixed:
                check(len(record["previewSampleIds"]) == len(fixed["vectors"]), "Checkpoint preview must cover the complete fixed latent set.")
            for sample_index, sample_id in enumerate(record["previewSampleIds"]):
                sample = resolve("sample", sample_id)
                if sample:
                    source = sample["provenance"]
                    check(source["origin"] == "synthetic" and source["checkpointId"] == record["id"], "Checkpoint preview is not from that checkpoint.")
                    if source["origin"] == "synthetic" and fixed:
                        check(sample_index < len(fixed["vectors"]) and source["latent"]["values"] == fixed["vectors"][sample_index], "Checkpoint preview does not follow the fixed latent set order.")

        elif kind == "history":
            check(record["runId"] in manifests, "History has no run manifest.")
            previous_step, previous_epoch = -1, -1
            for point in record["points"]:
                check(point["globalStep"] > previous_step and point["epoch"] >= previous_epoch, "History steps must increase and epochs cannot regress.")
                previous_step, previous_epoch = point["globalStep"], point["epoch"]

        elif kind == "question":
            sample = resolve("sample", record["sampleId"])
            session = resolve("session", record["sessionId"])
            if sample:
                check(record["image"] == sample["image"], "Question image differs from registered sample.")
            if session:
                check(record["missionId"] == session["missionId"], "Question/session mission mismatch.")
                check(len(session["sampleIds"]) > record["roundIndex"] and session["sampleIds"][record["roundIndex"]] == record["sampleId"], "Question differs from session order.")

        elif kind == "round-reveal":
            check_answer(record)

        elif kind == "session":
            phase, index, answers = record["phase"], record["currentRoundIndex"], record["answers"]
            check(record["missionId"] in MISSION_IDS, "Unknown session mission.")
            check(record["score"] == sum(answer["points"] for answer in answers), "Session score differs from recorded answers.")
            check(len({answer["sampleId"] for answer in answers}) == len(answers), "Duplicate answer in a session.")
            check((record["error"] is not None) == (phase == "error"), "Global error must match the error phase.")
            if phase == "error":
                check(len(record["sampleIds"]) in (0, 5) and len(answers) <= index + 1, "Error recovery cannot contain a partial batch or future answers.")
            if phase in ("briefing", "preparing"):
                check(not answers and not record["sampleIds"] and index == 0, "Pre-game states cannot contain prepared rounds or answers.")
            elif phase != "error":
                check(len(record["sampleIds"]) == 5, "Prepared sessions require five samples.")
                expected_count = index if phase == "investigating" else index + 1
                check(len(answers) == expected_count, "Answer count does not match session phase.")
                if phase == "summary":
                    check(index == 4 and len(answers) == 5, "Summary requires five completed rounds.")
            for round_index, sample_id in enumerate(record["sampleIds"]):
                sample = resolve("sample", sample_id)
                if sample and sample["provenance"]["origin"] == "real":
                    check(sample["provenance"]["partition"] == "arena", "Arena cannot consume training/development/test samples.")
                if round_index < len(answers):
                    answer = answers[round_index]
                    check(answer["sampleId"] == sample_id and answer["roundIndex"] == round_index, "Answers do not follow the selected sample order.")
            if len(record["sampleIds"]) == 5:
                origins = [resolve("sample", sample_id) for sample_id in record["sampleIds"]]
                if all(origins):
                    check(sum(sample["provenance"]["origin"] == "real" for sample in origins) in (2, 3), "Mission origins must be balanced 2/3.")
            for answer in answers:
                check_answer(answer)

        elif kind == "creation":
            manifest = manifests.get(record["runId"])
            check(manifest is not None, "Creation has no run manifest.")
            check_latent(record["latent"], manifest)
            checkpoint = resolve("checkpoint", record["checkpointId"])
            if checkpoint:
                check(checkpoint["runId"] == record["runId"] and checkpoint["generator"]["sha256"] == record["generatorSha256"], "Creation/checkpoint mismatch.")

        elif kind == "progress":
            completed = set(record["completedMissionIds"])
            mission_records = record["missions"]
            check(completed <= MISSION_IDS, "Unknown completed mission.")
            check(len({item["missionId"] for item in mission_records}) == len(mission_records), "Duplicate mission progress.")
            check({item["missionId"] for item in mission_records} == completed, "Progress records differ from completed missions.")
            check(sum(item["completions"] for item in mission_records) == len(record["completedSessionIds"]), "Completion count differs from committed session identifiers.")
            for item in mission_records:
                check(item["bestScore"] == item["bestCorrect"] * 100, "Best score/correct count mismatch.")
            for mission in EXPERIENCE["missions"]:
                if mission["id"] in completed and mission["requiresCompletion"]:
                    check(mission["requiresCompletion"] in completed, "A mission was completed without its prerequisite.")
            expected_badges = (["first-mission"] if completed else []) + (["all-missions"] if completed == MISSION_IDS else [])
            check(set(record["badges"]) == set(expected_badges), "Badges must be derived from completed missions.")
    return errors


def contrast(foreground, background):
    def luminance(value):
        rgb = [int(value[index:index + 2], 16) / 255 for index in (1, 3, 5)]
        linear = [channel / 12.92 if channel <= .04045 else ((channel + .055) / 1.055) ** 2.4 for channel in rgb]
        return sum(channel * weight for channel, weight in zip(linear, (.2126, .7152, .0722)))
    low, high = sorted((luminance(foreground), luminance(background)))
    return (high + .05) / (low + .05)


def main():
    bundle = read(ROOT / "contracts/examples.v1.json")
    errors = validate_bundle(bundle)
    if errors:
        raise AssertionError("\n".join(errors))
    find = lambda data, kind: next(record for record in data["records"] if record["kind"] == kind)
    negative_cases = [
        ("origin-in-question", lambda data: find(data, "question").update(correctOrigin="synthetic")),
        ("wrong-score", lambda data: find(data, "session").update(score=500)),
        ("duplicate-answer", lambda data: find(data, "session")["answers"].append(deepcopy(find(data, "session")["answers"][0]))),
        ("latent-dimension", lambda data: find(data, "creation")["latent"].update(dimension=8)),
        ("split-overlap", lambda data: find(data, "dataset-split")["partitions"]["arena"].append("fixture-train-01")),
        ("arena-test-leak", lambda data: next(record for record in data["records"] if record["kind"] == "sample" and record["provenance"]["origin"] == "real")["provenance"].update(partition="test", recordId="fixture-test-01")),
        ("wrong-answer-key", lambda data: find(data, "round-reveal").update(correctOrigin="real")),
        ("false-discriminator-score", lambda data: find(data, "round-reveal")["discriminator"].update(score=.9)),
        ("checkpoint-vector", lambda data: find(data, "latent-set")["vectors"][0].__setitem__(0, 9)),
        ("history-regression", lambda data: find(data, "history")["points"][1].update(globalStep=1)),
        ("early-summary", lambda data: find(data, "session")["answers"].pop()),
        ("path-traversal", lambda data: find(data, "model-manifest")["generator"]["asset"].update(path="../generator.onnx")),
        ("mixed-mode", lambda data: find(data, "session")["answers"][0].update(dataMode="recorded")),
        ("bad-progress", lambda data: find(data, "progress")["missions"][0].update(bestCorrect=4)),
        ("inconsistent-shape", lambda data: find(data, "model-manifest")["generator"]["input"].update(shape=["N", 64, 1, 1])),
    ]
    rejected = []
    for name, mutate in negative_cases:
        invalid = deepcopy(bundle)
        mutate(invalid)
        if not validate_bundle(invalid):
            raise AssertionError(f"Invalid example accepted: {name}")
        rejected.append(name)
    assert validate_bundle(bundle, require_recorded=True), "Fixtures must not be accepted as real results."
    rejected.append("fixture-as-recorded-result")

    tokens = read(ROOT / "tokens.v1.json")
    ratios = []
    for pair in tokens["contrastPairs"]:
        ratio = contrast(tokens["colors"][pair["foreground"]], tokens["colors"][pair["background"]])
        assert ratio >= pair["minimumRatio"], f"Insufficient contrast: {pair['name']}"
        ratios.append({"name": pair["name"], "ratio": round(ratio, 3), "required": pair["minimumRatio"]})
    for font in (tokens["typography"]["display"], tokens["typography"]["body"]):
        assert (PROJECT / font["source"]).is_file()
        assert (PROJECT / font["license"]).is_file()
    assert EXPERIENCE["game"]["maxScore"] == EXPERIENCE["game"]["roundCount"] * EXPERIENCE["game"]["pointsCorrect"]
    assert len(EXPERIENCE["screens"]) == 10
    assert len(EXPERIENCE["missions"]) == 3
    assets = read(ROOT / "assets.v1.json")
    for character in assets["characters"]:
        assert (ROOT / character["referenceSheet"]).is_file()
    assert (ROOT / assets["referenceScreen"]).is_file()
    report = {"stage": "01 — Direção e contratos", "status": "passed", "schemaDraft": "2020-12", "contractKinds": len(KINDS), "validExampleRecords": len(bundle["records"]), "invalidCasesRejected": rejected, "contrastPairs": ratios, "referenceSheets": 2, "notice": "Validação da especificação e de exemplos fictícios; não valida pesos nem execução da GAN."}
    (ROOT / "VALIDACAO.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"Etapa 01: {len(KINDS)} contratos, {len(bundle['records'])} exemplos, {len(rejected)} rejeições e {len(ratios)} pares de contraste: OK.")


if __name__ == "__main__":
    main()
