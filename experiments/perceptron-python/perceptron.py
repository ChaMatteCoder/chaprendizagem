# perceptron.py

import random


class Perceptron:
    def __init__(self, quantidade_entradas, taxa_aprendizado=0.1):
        self.quantidade_entradas = quantidade_entradas
        self.taxa_aprendizado = taxa_aprendizado

        self.pesos = []
        for _ in range(quantidade_entradas):
            self.pesos.append(random.uniform(-0.5, 0.5))

        self.bias = random.uniform(-0.5, 0.5)

    def ativacao(self, soma):
        if soma >= 0:
            return 1
        else:
            return -1

    def calcular_soma(self, entradas):
        soma = 0

        for i in range(self.quantidade_entradas):
            soma += entradas[i] * self.pesos[i]

        soma += self.bias

        return soma

    def prever(self, entradas):
        soma = self.calcular_soma(entradas)
        saida = self.ativacao(soma)

        return saida

    def treinar(self, entradas, saida_esperada):
        saida_obtida = self.prever(entradas)
        erro = saida_esperada - saida_obtida

        for i in range(self.quantidade_entradas):
            self.pesos[i] = self.pesos[i] + self.taxa_aprendizado * erro * entradas[i]

        self.bias = self.bias + self.taxa_aprendizado * erro

        return erro