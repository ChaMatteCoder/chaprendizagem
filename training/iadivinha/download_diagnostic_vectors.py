"""Small fixed diagnostic sample, separate from training; not a human-game benchmark."""
import json
import urllib.parse
import urllib.request

from common import HERE, classes, write_json

rows = []
for item in classes():
    url = 'https://storage.googleapis.com/quickdraw_dataset/full/simplified/' + urllib.parse.quote(item['datasetLabel']) + '.ndjson'
    with urllib.request.urlopen(url, timeout=45) as response:
        for index, line in enumerate(response):
            if index == 30:
                break
            row = json.loads(line)
            rows.append({'id': item['id'], 'key_id': row['key_id'], 'drawing': row['drawing']})
write_json(HERE / 'runs/stroke-diagnostic/vectors.json', rows)
print(f'Saved {len(rows)} diagnostic vectors; no model training or replacement.')
