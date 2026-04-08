import requests
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

GITHUB_API = "https://api.github.com"
HEADERS = {"Accept": "application/vnd.github+json"}


def get_user(username: str) -> dict:
    resp = requests.get(f"{GITHUB_API}/users/{username}", headers=HEADERS, timeout=10)
    if resp.status_code == 404:
        raise ValueError(f"Usuário '{username}' não encontrado no GitHub.")
    if resp.status_code == 403:
        raise RuntimeError("Rate limit atingido. Tente novamente em alguns minutos.")
    resp.raise_for_status()
    return resp.json()


def get_repos(username: str, max_repos: int = 60) -> list[dict]:
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


def fetch_city_data(username: str, max_workers: int = 12) -> dict:
    user = get_user(username)
    raw_repos = get_repos(username)

    buildings = []
    results = {}

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(get_commit_count, username, repo["name"]): repo
            for repo in raw_repos
        }

        for future in as_completed(futures):
            repo = futures[future]
            try:
                count = future.result()
            except Exception:
                count = 0

            results[repo["name"]] = count

    for repo in raw_repos:
        name = repo["name"]
        buildings.append({
            "name": name,
            "commits": results.get(name, 0),
            "stars": repo.get("stargazers_count", 0),
            "language": repo.get("language") or "Unknown",
            "description": repo.get("description") or "",
            "url": repo.get("html_url", ""),
            "fork": repo.get("fork", False),
            "size_kb": repo.get("size", 0),
        })

    buildings.sort(key=lambda r: r["commits"], reverse=True)

    return {"user": user, "repos": buildings}
