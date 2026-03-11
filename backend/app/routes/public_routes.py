from flask import Blueprint, jsonify
from ..models import Torneio, Jogo

bp = Blueprint('public', __name__, url_prefix='/api/public')

@bp.route('/jogos', methods=['GET'])
def get_all_jogos():
    """Retorna todos os jogos de todos os torneios (para o feed público)"""
    jogos = Jogo.query.order_by(Jogo.data_hora.desc()).all()
    resultados = []
    for j in jogos:
        resultados.append({
            "id": j.id,
            "fase": j.fase,
            "time_a_nome": j.time_a.nome if j.time_a else "A definir",
            "time_a_sigla": j.time_a.sigla if j.time_a else "TBD",
            "time_b_nome": j.time_b.nome if j.time_b else "A definir",
            "time_b_sigla": j.time_b.sigla if j.time_b else "TBD",
            "placar_a": j.placar_a,
            "placar_b": j.placar_b,
            "status": j.status,
            "data_hora": j.data_hora.isoformat() if j.data_hora else None,
            "vencedor_id": j.vencedor_id
        })
    return jsonify(resultados)

@bp.route('/torneio/<int:torneio_id>', methods=['GET'])
def get_torneio_public(torneio_id):
    torneio = Torneio.query.get_or_404(torneio_id)
    return jsonify({
        "id": torneio.id,
        "nome": torneio.nome,
        "local": torneio.local,
        "status": torneio.status
    })

@bp.route('/torneio/<int:torneio_id>/jogos', methods=['GET'])
def get_jogos_public(torneio_id):
    # Retorna todos os jogos, útil para a página principal (WebView)
    jogos = Jogo.query.filter_by(torneio_id=torneio_id).order_by(Jogo.data_hora.asc()).all()
    
    resultados = []
    for j in jogos:
        resultados.append({
            "id": j.id,
            "fase": j.fase,
            "time_a": {"id": j.time_a.id, "nome": j.time_a.nome, "sigla": j.time_a.sigla, "escudo": j.time_a.escudo} if j.time_a else None,
            "time_b": {"id": j.time_b.id, "nome": j.time_b.nome, "sigla": j.time_b.sigla, "escudo": j.time_b.escudo} if j.time_b else None,
            "placar_a": j.placar_a,
            "placar_b": j.placar_b,
            "status": j.status, # agendado, andamento, intervalo, finalizado
            "data_hora": j.data_hora.isoformat() if j.data_hora else None,
            "vencedor_id": j.vencedor_id
        })
    return jsonify(resultados)
    
@bp.route('/torneio/<int:torneio_id>/jogo-atual', methods=['GET'])
def get_jogo_atual(torneio_id):
    # Retorna os jogos que estão com status 'andamento' ou 'intervalo'
    jogos_atuais = Jogo.query.filter(
        Jogo.torneio_id == torneio_id,
        Jogo.status.in_(['andamento', 'intervalo'])
    ).all()
    
    resultados = []
    for j in jogos_atuais:
        resultados.append({
            "id": j.id,
            "fase": j.fase,
            "time_a": {"nome": j.time_a.nome, "escudo": j.time_a.escudo} if j.time_a else None,
            "time_b": {"nome": j.time_b.nome, "escudo": j.time_b.escudo} if j.time_b else None,
            "placar_a": j.placar_a,
            "placar_b": j.placar_b,
            "status": j.status
        })
        
    return jsonify(resultados)
