from flask import Blueprint, request, jsonify
from ..models import db, Torneio, Time, Jogo

bp = Blueprint('public', __name__, url_prefix='/api/public')

@bp.route('/torneio/<int:torneio_id>/jogos', methods=['GET'])
def get_jogos_publico(torneio_id):
    jogos = Jogo.query.filter_by(torneio_id=torneio_id).all()
    resultados = []
    for j in jogos:
        resultados.append({
            "id": j.id,
            "fase": j.fase,
            "rodada": j.rodada,
            "time_a_nome": j.time_a.nome if j.time_a else "A definir",
            "time_b_nome": j.time_b.nome if j.time_b else "A definir",
            "time_a_sigla": j.time_a.sigla if j.time_a else "???",
            "time_b_sigla": j.time_b.sigla if j.time_b else "???",
            "time_a_escudo": j.time_a.escudo if j.time_a else None,
            "time_b_escudo": j.time_b.escudo if j.time_b else None,
            "placar_a": j.placar_a,
            "placar_b": j.placar_b,
            "status": j.status,
            "data_hora": j.data_hora.isoformat() if j.data_hora else None,
            "vencedor_id": j.vencedor_id
        })
    return jsonify(resultados)

@bp.route('/jogos', methods=['GET'])
def get_all_jogos_publico():
    """Retorna todos os jogos, com filtros opcionais: ?data=YYYY-MM-DD, ?time=nome"""
    from datetime import datetime
    
    query = Jogo.query
    
    # Filter by date
    data_filter = request.args.get('data')
    if data_filter:
        try:
            target_date = datetime.strptime(data_filter, '%Y-%m-%d').date()
            query = query.filter(db.func.date(Jogo.data_hora) == target_date)
        except ValueError:
            pass  # Ignore invalid date
    
    # Filter by team name (partial match)
    time_filter = request.args.get('time')
    if time_filter:
        time_filter_lower = time_filter.lower()
        # Get team IDs that match the filter
        matching_times = Time.query.filter(
            db.func.lower(Time.nome).contains(time_filter_lower)
        ).all()
        matching_ids = [t.id for t in matching_times]
        if matching_ids:
            query = query.filter(
                (Jogo.time_a_id.in_(matching_ids)) | (Jogo.time_b_id.in_(matching_ids))
            )
        else:
            return jsonify([])  # No matching teams
    
    jogos = query.order_by(Jogo.data_hora.desc()).all()
    resultados = []
    for j in jogos:
        resultados.append({
            "id": j.id,
            "fase": j.fase,
            "rodada": j.rodada,
            "time_a_nome": j.time_a.nome if j.time_a else "A definir",
            "time_b_nome": j.time_b.nome if j.time_b else "A definir",
            "time_a_sigla": j.time_a.sigla if j.time_a else "???",
            "time_b_sigla": j.time_b.sigla if j.time_b else "???",
            "time_a_escudo": j.time_a.escudo if j.time_a else None,
            "time_b_escudo": j.time_b.escudo if j.time_b else None,
            "placar_a": j.placar_a,
            "placar_b": j.placar_b,
            "status": j.status,
            "data_hora": j.data_hora.isoformat() if j.data_hora else None,
            "vencedor_id": j.vencedor_id
        })
    return jsonify(resultados)

@bp.route('/bracket/<int:torneio_id>', methods=['GET'])
def get_bracket(torneio_id):
    """Retorna a estrutura completa do bracket por rodada"""
    jogos = Jogo.query.filter_by(torneio_id=torneio_id).order_by(Jogo.rodada.asc()).all()
    
    bracket = {}
    for j in jogos:
        rodada = j.rodada or 1
        if rodada not in bracket:
            bracket[rodada] = {
                "fase": j.fase,
                "jogos": []
            }
        bracket[rodada]["jogos"].append({
            "id": j.id,
            "time_a_nome": j.time_a.nome if j.time_a else "A definir",
            "time_b_nome": j.time_b.nome if j.time_b else "A definir",
            "time_a_sigla": j.time_a.sigla if j.time_a else "???",
            "time_b_sigla": j.time_b.sigla if j.time_b else "???",
            "time_a_escudo": j.time_a.escudo if j.time_a else None,
            "time_b_escudo": j.time_b.escudo if j.time_b else None,
            "placar_a": j.placar_a,
            "placar_b": j.placar_b,
            "status": j.status,
            "vencedor_id": j.vencedor_id
        })
    
    return jsonify(bracket)
