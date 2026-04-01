import requests
from typing import Optional

GITHUB_API = "https://api.github.com"
HEADERS = {"Accept": "application/vnd.github+json"}


def get_user(username: str) -> dict:
    """Retorna info básica do usuário. Lança ValueError se não existir."""
    resp = requests.get(f"{GITHUB_API}/users/{username}", headers=HEADERS, timeout=10)
    if resp.status_code == 404:
        raise ValueError(f"Usuário '{username}' não encontrado no GitHub.")
    if resp.status_code == 403:
        raise RuntimeError("Rate limit atingido. Tente novamente em alguns minutos.")
    resp.raise_for_status()
    return resp.json()


def get_repos(username: str, max_repos: int = 60) -> list[dict]:
    """
    Retorna lista de repositórios públicos do usuário.
    Já exclui repos sem atividade (size=0) e traz no máx. max_repos.
    """
    repos = []
    page = 1
    while len(repos) < max_repos:
        resp = requests.get(
            f"{GITHUB_API}/users/{username}/repos",
            headers=HEADERS,
            params={"per_page": 100, "page": page, "sort": "pushed"},
            timeout=10,
        )
        if resp.status_code == 403:
            raise RuntimeError("Rate limit atingido.")
        resp.raise_for_status()
        data = resp.json()
        if not data:
            break
        repos.extend(data)
        page += 1
        if len(data) < 100:
            break

    return repos[:max_repos]


def get_commit_count(username: str, repo_name: str) -> int:
    """
    Conta commits de um repo usando o endpoint de contributors (mais rápido).
    Cai pro endpoint de commits com paginação como fallback.
    """
    resp = requests.get(
        f"{GITHUB_API}/repos/{username}/{repo_name}/contributors",
        headers=HEADERS,
        params={"per_page": 100, "anon": "true"},
        timeout=10,
    )
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list) and data:
            return sum(c.get("contributions", 0) for c in data)

    resp = requests.get(
        f"{GITHUB_API}/repos/{username}/{repo_name}/commits",
        headers=HEADERS,
        params={"per_page": 1},
        timeout=10,
    )
    if resp.status_code != 200:
        return 0

    link = resp.headers.get("Link", "")
    if 'rel="last"' in link:
        import re
        m = re.search(r'page=(\d+)>; rel="last"', link)
        if m:
            return int(m.group(1))

    data = resp.json()
    return len(data) if isinstance(data, list) else 0


def fetch_city_data(username: str) -> dict:
    """
    Ponto de entrada principal.
    Retorna { user: {...}, repos: [ {name, commits, stars, language, ...} ] }
    """
    user = get_user(username)
    raw_repos = get_repos(username)

    buildings = []
    for repo in raw_repos:
        name = repo["name"]
        count = get_commit_count(username, name)
        buildings.append({
            "name": name,
            "commits": count,
            "stars": repo.get("stargazers_count", 0),
            "language": repo.get("language") or "Unknown",
            "description": repo.get("description") or "",
            "url": repo.get("html_url", ""),
            "fork": repo.get("fork", False),
            "size_kb": repo.get("size", 0),
        })

    buildings.sort(key=lambda r: r["commits"], reverse=True)

    return {"user": user, "repos": buildings}
