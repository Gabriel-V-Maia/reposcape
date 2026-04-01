import math
import random
import hashlib
from typing import Optional

LANG_COLORS: dict[str, str] = {
    "JavaScript": "#f0db4f",
    "TypeScript": "#3178c6",
    "Python":     "#3572A5",
    "Go":         "#00ADD8",
    "Rust":       "#dea584",
    "Ruby":       "#701516",
    "Java":       "#b07219",
    "C++":        "#f34b7d",
    "C":          "#555555",
    "C#":         "#178600",
    "PHP":        "#4F5D95",
    "Swift":      "#F05138",
    "Kotlin":     "#A97BFF",
    "HTML":       "#e34c26",
    "CSS":        "#563d7c",
    "Shell":      "#89e051",
    "Dart":       "#00B4AB",
    "Scala":      "#c22d40",
    "Haskell":    "#5e5086",
    "Elixir":     "#6e4a7e",
    "Unknown":    "#444c56",
}

RANDOM_NAMES = [
    "aurora", "nova", "pulsar", "quasar", "nebula", "andromeda",
    "helios", "zephyr", "atlas", "orion", "lyra", "vega",
    "titan", "hydra", "phoenix", "cygnus", "draco", "corvus",
]

RANDOM_LANGS = list(LANG_COLORS.keys())[:-1]  


def _lang_color(lang: str) -> str:
    return LANG_COLORS.get(lang, LANG_COLORS["Unknown"])


def _building_width(ratio: float, is_fork: bool) -> int:
    """Largura do prédio: forks são mais finos."""
    base = 22 if is_fork else 30
    return base + int(ratio * 20)


def _building_height(commits: int, max_commits: int) -> int:
    """
    Altura usando raiz quadrada para não deixar o repo gigante esmagar os menores.
    Range: 28px (mínimo visível) até 340px.
    """
    if max_commits == 0:
        return 28
    ratio = math.sqrt(commits / max_commits)
    return max(28, int(28 + ratio * 312))


def _windows(width: int, height: int, seed_val: int) -> dict:
    """Calcula grid de janelas e quais estão acesas."""
    rng = random.Random(seed_val)
    cols = max(1, (width - 8) // 7)
    rows = max(1, (height - 10) // 11)
    lit = [rng.random() > 0.38 for _ in range(cols * rows)]
    return {"cols": cols, "rows": rows, "lit": lit}


def repos_to_buildings(repos: list[dict]) -> list[dict]:
    """Converte lista de repos em lista de building dicts prontos para renderização."""
    if not repos:
        return []

    max_commits = max((r["commits"] for r in repos), default=1) or 1
    buildings = []

    for i, repo in enumerate(repos):
        commits = repo["commits"]
        ratio = math.sqrt(commits / max_commits) if max_commits else 0
        h = _building_height(commits, max_commits)
        w = _building_width(ratio, repo.get("fork", False))
        color = _lang_color(repo.get("language", "Unknown"))
        seed_val = int(hashlib.md5(repo["name"].encode()).hexdigest(), 16) % 99999

        buildings.append({
            "name": repo["name"],
            "commits": commits,
            "stars": repo.get("stars", 0),
            "language": repo.get("language", "Unknown"),
            "description": repo.get("description", ""),
            "url": repo.get("url", ""),
            "fork": repo.get("fork", False),
            "color": color,
            "height": h,
            "width": w,
            "antenna": h > 170,
            "antenna_height": max(10, int(10 + ratio * 22)),
            "windows": _windows(w, h, seed_val),
            "index": i,
        })

    return buildings


def generate_seed_city(seed: Optional[int] = None, n_buildings: int = 20) -> dict:
    """
    Gera uma cidade fictícia aleatória para demo.
    Retorna o mesmo formato que repos_to_buildings.
    """
    if seed is None:
        seed = random.randint(0, 999_999)

    rng = random.Random(seed)

  
    def rand_commits():
        r = rng.random()
        if r > 0.85:
            return rng.randint(500, 3000)
        if r > 0.6:
            return rng.randint(100, 499)
        return rng.randint(1, 99)

    repos = []
    used_names = set()
    for _ in range(n_buildings):
        name_base = rng.choice(RANDOM_NAMES)
        suffix = rng.choice(["", "-api", "-app", "-lib", "-cli", "-web", "-core", "-ui"])
        name = name_base + suffix
        if name in used_names:
            name = name + str(rng.randint(2, 9))
        used_names.add(name)

        repos.append({
            "name": name,
            "commits": rand_commits(),
            "stars": rng.randint(0, 200),
            "language": rng.choice(RANDOM_LANGS),
            "description": "",
            "url": "#",
            "fork": rng.random() < 0.2,
            "size_kb": rng.randint(0, 5000),
        })

    repos.sort(key=lambda r: r["commits"], reverse=True)
    buildings = repos_to_buildings(repos)

    return {
        "seed": seed,
        "buildings": buildings,
        "username": f"seed:{seed}",
        "is_seed": True,
        "total_commits": sum(r["commits"] for r in repos),
        "languages": _top_langs(repos),
    }


def city_from_github(data: dict) -> dict:
    """Prepara dados vindos de github.fetch_city_data para renderização."""
    repos = data["repos"]
    buildings = repos_to_buildings(repos)
    return {
        "seed": None,
        "buildings": buildings,
        "username": data["user"]["login"],
        "avatar": data["user"].get("avatar_url", ""),
        "bio": data["user"].get("bio", ""),
        "is_seed": False,
        "total_commits": sum(r["commits"] for r in repos),
        "languages": _top_langs(repos),
    }


def _top_langs(repos: list[dict], top_n: int = 5) -> list[dict]:
    counts: dict[str, int] = {}
    for r in repos:
        lang = r.get("language", "Unknown") or "Unknown"
        counts[lang] = counts.get(lang, 0) + 1
    sorted_langs = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [
        {"name": l, "count": c, "color": _lang_color(l)}
        for l, c in sorted_langs[:top_n]
    ]
