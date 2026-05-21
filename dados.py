# dados.py

DIGITOS = {
    0: [
        [-1,  1,  1, -1],
        [ 1, -1, -1,  1],
        [ 1, -1, -1,  1],
        [ 1, -1, -1,  1],
        [-1,  1,  1, -1],
    ],

    1: [
        [-1, -1,  1, -1],
        [-1,  1,  1, -1],
        [-1, -1,  1, -1],
        [-1, -1,  1, -1],
        [-1,  1,  1,  1],
    ],

    2: [
        [-1,  1,  1, -1],
        [ 1, -1, -1,  1],
        [-1, -1,  1, -1],
        [-1,  1, -1, -1],
        [ 1,  1,  1,  1],
    ],

    3: [
        [ 1,  1,  1, -1],
        [-1, -1, -1,  1],
        [-1,  1,  1, -1],
        [-1, -1, -1,  1],
        [ 1,  1,  1, -1],
    ],

    4: [
        [ 1, -1, -1,  1],
        [ 1, -1, -1,  1],
        [ 1,  1,  1,  1],
        [-1, -1, -1,  1],
        [-1, -1, -1,  1],
    ],

    5: [
        [ 1,  1,  1,  1],
        [ 1, -1, -1, -1],
        [ 1,  1,  1, -1],
        [-1, -1, -1,  1],
        [ 1,  1,  1, -1],
    ],

    6: [
        [-1,  1,  1,  1],
        [ 1, -1, -1, -1],
        [ 1,  1,  1, -1],
        [ 1, -1, -1,  1],
        [-1,  1,  1, -1],
    ],

    7: [
        [ 1,  1,  1,  1],
        [-1, -1, -1,  1],
        [-1, -1,  1, -1],
        [-1,  1, -1, -1],
        [-1,  1, -1, -1],
    ],

    8: [
        [-1,  1,  1, -1],
        [ 1, -1, -1,  1],
        [-1,  1,  1, -1],
        [ 1, -1, -1,  1],
        [-1,  1,  1, -1],
    ],

    9: [
        [-1,  1,  1, -1],
        [ 1, -1, -1,  1],
        [-1,  1,  1,  1],
        [-1, -1, -1,  1],
        [ 1,  1,  1, -1],
    ],
}


def matriz_para_vetor(matriz):
    vetor = []

    for linha in matriz:
        for valor in linha:
            vetor.append(valor)

    return vetor


def gerar_saida_esperada(digito_correto):
    saida = []

    for digito in range(10):
        if digito == digito_correto:
            saida.append(1)
        else:
            saida.append(-1)

    return saida


def criar_base_treinamento():
    base = []

    for digito, matriz in DIGITOS.items():
        entrada = matriz_para_vetor(matriz)
        saida_esperada = gerar_saida_esperada(digito)

        base.append({
            "digito": digito,
            "entrada": entrada,
            "saida_esperada": saida_esperada
        })

    return base