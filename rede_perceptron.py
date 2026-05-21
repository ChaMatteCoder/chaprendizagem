# rede_perceptron.py

from perceptron import Perceptron


class RedePerceptron:
    def __init__(self, quantidade_entradas, quantidade_classes=10, taxa_aprendizado=0.1):
        self.quantidade_entradas = quantidade_entradas
        self.quantidade_classes = quantidade_classes
        self.taxa_aprendizado = taxa_aprendizado

        self.perceptrons = []

        for _ in range(quantidade_classes):
            perceptron = Perceptron(
                quantidade_entradas=quantidade_entradas,
                taxa_aprendizado=taxa_aprendizado
            )

            self.perceptrons.append(perceptron)

    def prever_saidas(self, entradas):
        saidas = []

        for perceptron in self.perceptrons:
            saida = perceptron.prever(entradas)
            saidas.append(saida)

        return saidas

    def prever_classe(self, entradas):
        saidas = self.prever_saidas(entradas)

        for indice, saida in enumerate(saidas):
            if saida == 1:
                return indice

        return None

    def treinar_amostra(self, entradas, saidas_esperadas):
        erro_total = 0

        for i in range(self.quantidade_classes):
            erro = self.perceptrons[i].treinar(
                entradas,
                saidas_esperadas[i]
            )

            erro_total += abs(erro)

        return erro_total

    def treinar(self, base_treinamento, epocas=100):
        erros_por_epoca = []

        for epoca in range(epocas):
            erro_total_epoca = 0

            for amostra in base_treinamento:
                entradas = amostra["entrada"]
                saidas_esperadas = amostra["saida_esperada"]

                erro_total_epoca += self.treinar_amostra(
                    entradas,
                    saidas_esperadas
                )

            erros_por_epoca.append(erro_total_epoca)

            print(f"Época {epoca + 1} | Erro total: {erro_total_epoca}")

            if erro_total_epoca == 0:
                break

        return erros_por_epoca