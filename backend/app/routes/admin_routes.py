from flask import Blueprint, request, jsonify
from datetime import datetime
from ..models import db, Torneio, Time, Jogo
from ..utils.auth import token_required

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# --- TORNEIOS E STATS ---
@bp.route('/stats', methods=['GET'])
@token_required
def get_stats():
    from ..models import Pagamento
    
    total_arrecadado = db.session.query(db.func.sum(Pagamento.valor)).filter(Pagamento.status == 'aprovado').scalar() or 0
    acessos_liberados = Pagamento.query.filter_by(status='aprovado').count()
    jogos_andamento = Jogo.query.filter_by(status='andamento').count()
    
    return jsonify({
        "total_arrecadado": float(total_arrecadado),
        "acessos_liberados": acessos_liberados,
        "jogos_andamento": jogos_andamento
    })

@bp.route('/torneios', methods=['GET'])
@token_required
def get_torneios():
    torneios = Torneio.query.all()
    return jsonify([{
        "id": t.id, 
        "nome": t.nome, 
        "local": t.local, 
        "data_inicio": t.data_inicio.isoformat(), 
        "status": t.status
    } for t in torneios])

@bp.route('/torneios', methods=['POST'])
@token_required
def create_torneio():
    data = request.json
    try:
        data_inicio = datetime.strptime(data['data_inicio'], '%Y-%m-%d').date()
        novo_torneio = Torneio(
            nome=data['nome'],
            local=data['local'],
            data_inicio=data_inicio,
            status=data.get('status', 'agendado')
        )
        db.session.add(novo_torneio)
        db.session.commit()
        return jsonify({"message": "Torneio criado com sucesso", "id": novo_torneio.id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# --- TIMES ---
@bp.route('/times', methods=['GET'])
@token_required
def get_times():
    times = Time.query.all()
    return jsonify([{
        "id": t.id, 
        "nome": t.nome, 
        "sigla": t.sigla, 
        "responsavel": t.responsavel,
        "escudo": t.escudo
    } for t in times])

@bp.route('/times', methods=['POST'])
@token_required
def create_time():
    data = request.json
    try:
        novo_time = Time(
            nome=data['nome'],
            sigla=data['sigla'],
            responsavel=data.get('responsavel'),
            escudo=data.get('escudo')
        )
        db.session.add(novo_time)
        db.session.commit()
        return jsonify({"message": "Time criado com sucesso", "id": novo_time.id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@bp.route('/times/<int:time_id>', methods=['PUT'])
@token_required
def update_time(time_id):
    data = request.json
    time = Time.query.get_or_404(time_id)
    if 'nome' in data: time.nome = data['nome']
    if 'sigla' in data: time.sigla = data['sigla']
    if 'responsavel' in data: time.responsavel = data['responsavel']
    if 'escudo' in data: time.escudo = data['escudo']
    db.session.commit()
    return jsonify({"message": "Time atualizado com sucesso!"})

@bp.route('/times/<int:time_id>', methods=['DELETE'])
@token_required
def delete_time(time_id):
    time = Time.query.get_or_404(time_id)
    # Verifica se o time esta em algum jogo
    if Jogo.query.filter((Jogo.time_a_id == time_id) | (Jogo.time_b_id == time_id)).first():
        return jsonify({"error": "Não é possível excluir um time que já está em uma partida."}), 400
    db.session.delete(time)
    db.session.commit()
    return jsonify({"message": "Time excluído com sucesso!"})

# --- JOGOS / PLACAR ---
@bp.route('/jogos', methods=['GET'])
@token_required
def get_all_jogos():
    """Retorna todos os jogos de todos os torneios"""
    jogos = Jogo.query.order_by(Jogo.data_hora.desc()).all()
    resultados = []
    for j in jogos:
        resultados.append({
            "id": j.id,
            "fase": j.fase,
            "time_a": j.time_a.nome if j.time_a else None,
            "time_b": j.time_b.nome if j.time_b else None,
            "time_a_nome": j.time_a.nome if j.time_a else "A definir",
            "time_b_nome": j.time_b.nome if j.time_b else "A definir",
            "time_a_id": j.time_a_id,
            "time_b_id": j.time_b_id,
            "placar_a": j.placar_a,
            "placar_b": j.placar_b,
            "status": j.status,
            "data_hora": j.data_hora.isoformat() if j.data_hora else None,
            "vencedor_id": j.vencedor_id
        })
    return jsonify(resultados)

@bp.route('/jogos/<int:torneio_id>', methods=['GET'])
@token_required
def get_jogos(torneio_id):
    jogos = Jogo.query.filter_by(torneio_id=torneio_id).all()
    resultados = []
    for j in jogos:
        resultados.append({
            "id": j.id,
            "fase": j.fase,
            "time_a": j.time_a.nome if j.time_a else None,
            "time_b": j.time_b.nome if j.time_b else None,
            "time_a_nome": j.time_a.nome if j.time_a else "A definir",
            "time_b_nome": j.time_b.nome if j.time_b else "A definir",
            "time_a_id": j.time_a_id,
            "time_b_id": j.time_b_id,
            "placar_a": j.placar_a,
            "placar_b": j.placar_b,
            "status": j.status,
            "data_hora": j.data_hora.isoformat() if j.data_hora else None,
            "vencedor_id": j.vencedor_id
        })
    return jsonify(resultados)

@bp.route('/jogos', methods=['POST'])
@token_required
def create_jogo():
    data = request.json
    try:
        data_hora = datetime.strptime(data['data_hora'], '%Y-%m-%d %H:%M')
        novo_jogo = Jogo(
            torneio_id=data['torneio_id'],
            fase=data['fase'],
            time_a_id=data.get('time_a_id'),
            time_b_id=data.get('time_b_id'),
            data_hora=data_hora,
            status=data.get('status', 'agendado')
        )
        db.session.add(novo_jogo)
        db.session.commit()
        return jsonify({"message": "Jogo criado com sucesso", "id": novo_jogo.id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@bp.route('/jogos/<int:jogo_id>/placar', methods=['PUT'])
@token_required
def update_placar(jogo_id):
    data = request.json
    jogo = Jogo.query.get_or_404(jogo_id)
    
    if 'placar_a' in data:
        jogo.placar_a = data['placar_a']
    if 'placar_b' in data:
        jogo.placar_b = data['placar_b']
    if 'status' in data:
        jogo.status = data['status']
        if jogo.status == 'finalizado':
            if 'vencedor_id' in data:
                 jogo.vencedor_id = data['vencedor_id']
            elif jogo.placar_a > jogo.placar_b:
                 jogo.vencedor_id = jogo.time_a_id
            elif jogo.placar_b > jogo.placar_a:
                 jogo.vencedor_id = jogo.time_b_id
            # Em caso de empate, o frontend deve enviar o vencedor_id (ex: decisão por pênaltis)
        
    db.session.commit()
    return jsonify({"message": "Placar atualizado", "id": jogo.id})
