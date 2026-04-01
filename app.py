import random
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, render_template, request, jsonify, redirect, url_for
from src import github, city

app = Flask(__name__, template_folder="templates", static_folder="assets", static_url_path="/assets")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/city/<username>")
def city_view(username: str):
    return render_template("city.html", username=username, seed=None)


@app.route("/seed")
def seed_view():
    seed = request.args.get("s", type=int) or random.randint(0, 999_999)
    return render_template("city.html", username=None, seed=seed)


@app.route("/api/city/<username>")
def api_city(username: str):
    """Busca dados reais do GitHub e retorna JSON da cidade."""
    try:
        raw = github.fetch_city_data(username)
        data = city.city_from_github(raw)
        return jsonify({"ok": True, "data": data})
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 404
    except RuntimeError as e:
        return jsonify({"ok": False, "error": str(e)}), 429
    except Exception as e:
        return jsonify({"ok": False, "error": f"Erro inesperado: {e}"}), 500


@app.route("/api/seed")
def api_seed():
    """Gera cidade aleatória com seed opcional."""
    seed = request.args.get("s", type=int)
    n = request.args.get("n", default=20, type=int)
    n = max(5, min(n, 40))
    data = city.generate_seed_city(seed=seed, n_buildings=n)
    return jsonify({"ok": True, "data": data})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
