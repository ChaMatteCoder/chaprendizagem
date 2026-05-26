# main.py

from dados import DIGITOS, criar_base_treinamento
from rede_perceptron import RedePerceptron


def exibir_matriz(matriz):
    for linha in matriz:
        for valor in linha:
            if valor == 1:
                print("#", end=" ")
            else:
                print(".", end=" ")
        print()


base_treinamento = criar_base_treinamento()

rede = RedePerceptron(
    quantidade_entradas=20,
    quantidade_classes=10,
    taxa_aprendizado=0.1
)

print("Iniciando treinamento...\n")

erros_por_epoca = rede.treinar(
    base_treinamento=base_treinamento,
    epocas=100
)

print("\nTestando a rede treinada:")

for item in base_treinamento:
    digito_real = item["digito"]
    entrada = item["entrada"]

    saidas = rede.prever_saidas(entrada)
    digito_previsto = rede.prever_classe(entrada)

    print("\n==============================")
    print(f"Dígito real: {digito_real}")
    print(f"Dígito previsto: {digito_previsto}")
    print("Matriz:")

    exibir_matriz(DIGITOS[digito_real])

    print("Saídas dos 10 perceptrons:")
    print(saidas)
