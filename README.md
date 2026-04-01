# 🏙️ Reposcape

Visualize os repositórios do GitHub como uma cidade. Cada prédio é um repo, quanto mais commits, mais alto.

Inspirado no projeto "gitcity"

## Estrutura

```
reposcape/
├── src/
│   ├── github.py       # Busca repos e commits via GitHub API
│   ├── city.py         # Lógica de geração da cidade (layout, seed)
│   └── renderer.py     # Gera o HTML final da cidade
├── templates/
│   ├── index.html      # Página inicial (formulário)
│   └── city.html       # Visualização da cidade
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── city.js     # Renderização canvas da cidade
├── output/             # HTMLs exportados (futuro)
├── app.py              # Entry point Flask
├── requirements.txt
└── README.md
```

## Instalação

```bash
pip install -r requirements.txt
python app.py
```

Acesse http://localhost:5000
