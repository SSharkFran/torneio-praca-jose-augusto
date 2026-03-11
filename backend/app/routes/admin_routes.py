from flask import Blueprint, request, jsonify
from datetime import datetime
from ..models import db, Torneio, Time, Jogo
from ..utils.auth import token_required
import random
import math

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# --- TORNEIOS E STATS ---
@bp.route('/stats', methods=['GET'])
@token_required
def get_stats():
    from ..models import Pagamento
    
    total_arrecadado = db.session.query(db.func.sum(Pagamento.valor)).filter(Pagamento.status == 'aprovado').scalar() or 0
    acessos_liberados = Pagamento.query.filter_by(status='aprovado').count()
    jogos_andamento = Jogo.query.filter_by(status='andamento').count()
    total_times = Time.query.count()
    total_jogos = Jogo.query.count()
    jogos_finalizados = Jogo.query.filter_by(status='finalizado').count()
    
    # Próximo jogo agendado
    proximo_jogo = Jogo.query.filter_by(status='agendado').order_by(Jogo.data_hora.asc()).first()
    proximo_jogo_info = None
    if proximo_jogo:
        proximo_jogo_info = {
            "id": proximo_jogo.id,
            "time_a": proximo_jogo.time_a.nome if proximo_jogo.time_a else "A definir",
            "time_b": proximo_jogo.time_b.nome if proximo_jogo.time_b else "A definir",
            "fase": proximo_jogo.fase,
            "data_hora": proximo_jogo.data_hora.isoformat() if proximo_jogo.data_hora else None
        }
    
    return jsonify({
        "total_arrecadado": float(total_arrecadado),
        "acessos_liberados": acessos_liberados,
        "jogos_andamento": jogos_andamento,
        "total_times": total_times,
        "total_jogos": total_jogos,
        "jogos_finalizados": jogos_finalizados,
        "proximo_jogo": proximo_jogo_info
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
            "rodada": j.rodada,
            "time_a": j.time_a.nome if j.time_a else None,
            "time_b": j.time_b.nome if j.time_b else None,
            "time_a_nome": j.time_a.nome if j.time_a else "A definir",
            "time_b_nome": j.time_b.nome if j.time_b else "A definir",
            "time_a_escudo": j.time_a.escudo if j.time_a else None,
            "time_b_escudo": j.time_b.escudo if j.time_b else None,
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
            "rodada": j.rodada,
            "time_a": j.time_a.nome if j.time_a else None,
            "time_b": j.time_b.nome if j.time_b else None,
            "time_a_nome": j.time_a.nome if j.time_a else "A definir",
            "time_b_nome": j.time_b.nome if j.time_b else "A definir",
            "time_a_escudo": j.time_a.escudo if j.time_a else None,
            "time_b_escudo": j.time_b.escudo if j.time_b else None,
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
            status=data.get('status', 'agendado'),
            rodada=data.get('rodada', 1)
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
        
    db.session.commit()
    return jsonify({"message": "Placar atualizado", "id": jogo.id})

# --- BRACKET GENERATION ---
def get_fase_name(num_times):
    """Retorna o nome da fase baseado no número de times"""
    if num_times <= 2:
        return 'Final'
    elif num_times <= 4:
        return 'Semifinal'
    elif num_times <= 8:
        return 'Quartas de Final'
    elif num_times <= 16:
        return 'Oitavas de Final'
    else:
        return 'Fase de Grupos'

@bp.route('/bracket/generate', methods=['POST'])
@token_required
def generate_bracket():
    data = request.json
    torneio_id = data.get('torneio_id', 1)
    
    # Get all teams
    times = Time.query.all()
    if len(times) < 2:
        return jsonify({"error": "É preciso ter pelo menos 2 times cadastrados para gerar o chaveamento."}), 400
    
    # Check if bracket already exists
    existing_jogos = Jogo.query.filter_by(torneio_id=torneio_id).count()
    if existing_jogos > 0:
        # Delete existing games to regenerate
        Jogo.query.filter_by(torneio_id=torneio_id).delete()
        db.session.commit()
    
    # Shuffle teams randomly
    team_list = list(times)
    random.shuffle(team_list)
    
    # Pad to nearest power of 2 for clean bracket
    num_times = len(team_list)
    next_power = 2 ** math.ceil(math.log2(num_times)) if num_times > 1 else 2
    
    # Create first round matchups
    fase_name = get_fase_name(next_power)
    now = datetime.now()
    jogos_criados = 0
    
    for i in range(0, next_power, 2):
        time_a = team_list[i] if i < num_times else None
        time_b = team_list[i+1] if (i+1) < num_times else None
        
        jogo = Jogo(
            torneio_id=torneio_id,
            fase=fase_name,
            time_a_id=time_a.id if time_a else None,
            time_b_id=time_b.id if time_b else None,
            data_hora=now,
            status='agendado',
            rodada=1
        )
        
        # If one team has a bye (no opponent), auto-advance them
        if time_a and not time_b:
            jogo.vencedor_id = time_a.id
            jogo.status = 'finalizado'
            jogo.placar_a = 1
            jogo.placar_b = 0
        elif time_b and not time_a:
            jogo.vencedor_id = time_b.id
            jogo.status = 'finalizado'
            jogo.placar_a = 0
            jogo.placar_b = 1
            
        db.session.add(jogo)
        jogos_criados += 1
    
    db.session.commit()
    
    return jsonify({
        "message": f"Chaveamento gerado! {jogos_criados} jogos criados na fase '{fase_name}'.",
        "fase": fase_name,
        "jogos": jogos_criados
    }), 201

@bp.route('/bracket/advance', methods=['POST'])
@token_required
def advance_bracket():
    data = request.json
    torneio_id = data.get('torneio_id', 1)
    
    # Get all games in the tournament
    jogos = Jogo.query.filter_by(torneio_id=torneio_id).order_by(Jogo.rodada.asc()).all()
    
    if not jogos:
        return jsonify({"error": "Nenhum jogo encontrado no torneio."}), 400
    
    # Find the highest round
    max_rodada = max(j.rodada for j in jogos)
    current_round_jogos = [j for j in jogos if j.rodada == max_rodada]
    
    # Check if all games in current round are finalized
    pending = [j for j in current_round_jogos if j.status != 'finalizado']
    if pending:
        return jsonify({"error": f"Ainda há {len(pending)} jogo(s) não finalizado(s) na rodada atual. Finalize todos antes de avançar."}), 400
    
    # Collect winners
    winners = []
    for j in current_round_jogos:
        if j.vencedor_id:
            winners.append(j.vencedor_id)
        elif j.placar_a > j.placar_b:
            winners.append(j.time_a_id)
        elif j.placar_b > j.placar_a:
            winners.append(j.time_b_id)
        else:
            return jsonify({"error": f"Jogo {j.id} terminou em empate. Defina o vencedor (ex: pênaltis) antes de avançar."}), 400
    
    if len(winners) < 2:
        return jsonify({"message": "🏆 Torneio finalizado! O campeão já foi definido."}), 200
    
    # Create next round
    next_rodada = max_rodada + 1
    next_fase = get_fase_name(len(winners))
    now = datetime.now()
    
    for i in range(0, len(winners), 2):
        if i + 1 < len(winners):
            jogo = Jogo(
                torneio_id=torneio_id,
                fase=next_fase,
                time_a_id=winners[i],
                time_b_id=winners[i+1],
                data_hora=now,
                status='agendado',
                rodada=next_rodada
            )
            db.session.add(jogo)
    
    db.session.commit()
    
    return jsonify({
        "message": f"Fase avançada! {len(winners)//2} jogos criados na '{next_fase}'.",
        "fase": next_fase,
        "rodada": next_rodada
    }), 201
