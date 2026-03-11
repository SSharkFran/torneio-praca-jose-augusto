from flask import Blueprint, request, jsonify
from ..models import db, Torneio, Time, Jogo, Anotacao

bp = Blueprint('public', __name__, url_prefix='/api/public')

def format_jogo_public(j):
    return {
        "id": j.id,
        "fase": j.fase,
        "rodada": j.rodada,
        "time_a_nome": j.time_a.nome if j.time_a else "A definir",
        "time_b_nome": j.time_b.nome if j.time_b else "A definir",
        "time_a_sigla": j.time_a.sigla if j.time_a else "???",
        "time_b_sigla": j.time_b.sigla if j.time_b else "???",
        "time_a_escudo": j.time_a.escudo if j.time_a else None,
        "time_b_escudo": j.time_b.escudo if j.time_b else None,
        "time_a_id": j.time_a_id,
        "time_b_id": j.time_b_id,
        "placar_a": j.placar_a,
        "placar_b": j.placar_b,
        "status": j.status,
        "data_hora": j.data_hora.isoformat() if j.data_hora else None,
        "vencedor_id": j.vencedor_id,
        "anotacoes": [{
            "id": a.id,
            "tipo": a.tipo,
            "jogador": a.jogador,
            "minuto": a.minuto,
            "descricao": a.descricao,
            "time_id": a.time_id,
            "time_nome": a.time.nome if a.time else None
        } for a in j.anotacoes]
    }

@bp.route('/torneio/<int:torneio_id>/jogos', methods=['GET'])
def get_jogos_publico(torneio_id):
    jogos = Jogo.query.filter_by(torneio_id=torneio_id).all()
    return jsonify([format_jogo_public(j) for j in jogos])

@bp.route('/jogos', methods=['GET'])
def get_all_jogos_publico():
    from datetime import datetime
    
    query = Jogo.query
    
    data_filter = request.args.get('data')
    if data_filter:
        try:
            target_date = datetime.strptime(data_filter, '%Y-%m-%d').date()
            query = query.filter(db.func.date(Jogo.data_hora) == target_date)
        except ValueError:
            pass
    
    time_filter = request.args.get('time')
    if time_filter:
        time_filter_lower = time_filter.lower()
        matching_times = Time.query.filter(
            db.func.lower(Time.nome).contains(time_filter_lower)
        ).all()
        matching_ids = [t.id for t in matching_times]
        if matching_ids:
            query = query.filter(
                (Jogo.time_a_id.in_(matching_ids)) | (Jogo.time_b_id.in_(matching_ids))
            )
        else:
            return jsonify([])
    
    jogos = query.order_by(Jogo.data_hora.desc()).all()
    return jsonify([format_jogo_public(j) for j in jogos])

@bp.route('/bracket/<int:torneio_id>', methods=['GET'])
def get_bracket(torneio_id):
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

@bp.route('/torneio/ativo', methods=['GET'])
def get_torneio_ativo():
    """Retorna o torneio ativo atual"""
    torneio = Torneio.query.filter(Torneio.status.in_(['agendado', 'andamento'])).first()
    if torneio:
        return jsonify({
            "id": torneio.id,
            "nome": torneio.nome,
            "local": torneio.local,
            "status": torneio.status
        })
    return jsonify(None)

@bp.route('/historico', methods=['GET'])
def get_historico():
    """Retorna torneios arquivados"""
    torneios = Torneio.query.filter_by(status='arquivado').order_by(Torneio.data_inicio.desc()).all()
    return jsonify([{
        "id": t.id,
        "nome": t.nome,
        "local": t.local,
        "data_inicio": t.data_inicio.isoformat(),
        "status": t.status
    } for t in torneios])
