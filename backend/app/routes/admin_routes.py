from flask import Blueprint, request, jsonify
from datetime import datetime
from ..models import db, Torneio, Time, Jogo, Anotacao, torneio_times
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
    
    # Torneio ativo
    torneio_ativo = Torneio.query.filter(Torneio.status.in_(['agendado', 'andamento'])).first()
    torneio_info = None
    if torneio_ativo:
        torneio_info = {
            "id": torneio_ativo.id,
            "nome": torneio_ativo.nome,
            "status": torneio_ativo.status
        }
    
    return jsonify({
        "total_arrecadado": float(total_arrecadado),
        "acessos_liberados": acessos_liberados,
        "jogos_andamento": jogos_andamento,
        "total_times": total_times,
        "total_jogos": total_jogos,
        "jogos_finalizados": jogos_finalizados,
        "proximo_jogo": proximo_jogo_info,
        "torneio_ativo": torneio_info
    })

# --- TORNEIO MANAGEMENT ---
@bp.route('/torneios', methods=['GET'])
@token_required
def get_torneios():
    torneios = Torneio.query.order_by(Torneio.data_inicio.desc()).all()
    return jsonify([{
        "id": t.id, 
        "nome": t.nome, 
        "local": t.local, 
        "data_inicio": t.data_inicio.isoformat(), 
        "status": t.status,
        "times_participantes": [{"id": tm.id, "nome": tm.nome, "sigla": tm.sigla} for tm in t.times_participantes]
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
        
        # Add selected teams
        time_ids = data.get('time_ids', [])
        if time_ids:
            times = Time.query.filter(Time.id.in_(time_ids)).all()
            novo_torneio.times_participantes = times
        
        db.session.add(novo_torneio)
        db.session.commit()
        return jsonify({"message": "Torneio criado com sucesso", "id": novo_torneio.id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@bp.route('/torneios/<int:torneio_id>/finalizar', methods=['POST'])
@token_required
def finalizar_torneio(torneio_id):
    """Arquiva o torneio (guarda as informações para consulta futura)"""
    torneio = Torneio.query.get_or_404(torneio_id)
    torneio.status = 'arquivado'
    db.session.commit()
    return jsonify({"message": f"Torneio '{torneio.nome}' arquivado com sucesso!"})

@bp.route('/torneios/<int:torneio_id>/resetar', methods=['POST'])
@token_required
def resetar_torneio(torneio_id):
    """Zera os jogos do torneio para recomeçar"""
    torneio = Torneio.query.get_or_404(torneio_id)
    
    # Delete all annotations first (cascade)
    jogos = Jogo.query.filter_by(torneio_id=torneio_id).all()
    for j in jogos:
        Anotacao.query.filter_by(jogo_id=j.id).delete()
    
    # Delete all games
    Jogo.query.filter_by(torneio_id=torneio_id).delete()
    torneio.status = 'agendado'
    db.session.commit()
    return jsonify({"message": f"Torneio '{torneio.nome}' resetado! Todos os jogos foram removidos."})

@bp.route('/torneios/<int:torneio_id>/times', methods=['PUT'])
@token_required
def update_torneio_times(torneio_id):
    """Atualiza os times participantes de um torneio"""
    data = request.json
    torneio = Torneio.query.get_or_404(torneio_id)
    time_ids = data.get('time_ids', [])
    times = Time.query.filter(Time.id.in_(time_ids)).all()
    torneio.times_participantes = times
    db.session.commit()
    return jsonify({"message": f"{len(times)} times selecionados para o torneio."})

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
    jogos = Jogo.query.order_by(Jogo.data_hora.desc()).all()
    return jsonify([format_jogo(j) for j in jogos])

@bp.route('/jogos/<int:torneio_id>', methods=['GET'])
@token_required
def get_jogos(torneio_id):
    jogos = Jogo.query.filter_by(torneio_id=torneio_id).all()
    return jsonify([format_jogo(j) for j in jogos])

def format_jogo(j):
    return {
        "id": j.id,
        "fase": j.fase,
        "rodada": j.rodada,
        "time_a": j.time_a.nome if j.time_a else None,
        "time_b": j.time_b.nome if j.time_b else None,
        "time_a_nome": j.time_a.nome if j.time_a else "A definir",
        "time_b_nome": j.time_b.nome if j.time_b else "A definir",
        "time_a_escudo": j.time_a.escudo if j.time_a else None,
        "time_b_escudo": j.time_b.escudo if j.time_b else None,
        "time_a_sigla": j.time_a.sigla if j.time_a else "???",
        "time_b_sigla": j.time_b.sigla if j.time_b else "???",
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
            "time_nome": a.time.nome if a.time else None,
            "created_at": a.created_at.isoformat() if a.created_at else None
        } for a in j.anotacoes]
    }

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

# --- ANOTAÇÕES (Cartões, Faltas, etc) ---
@bp.route('/jogos/<int:jogo_id>/anotacoes', methods=['GET'])
@token_required
def get_anotacoes(jogo_id):
    anotacoes = Anotacao.query.filter_by(jogo_id=jogo_id).order_by(Anotacao.created_at.asc()).all()
    return jsonify([{
        "id": a.id,
        "tipo": a.tipo,
        "jogador": a.jogador,
        "minuto": a.minuto,
        "descricao": a.descricao,
        "time_id": a.time_id,
        "time_nome": a.time.nome if a.time else None
    } for a in anotacoes])

@bp.route('/jogos/<int:jogo_id>/anotacoes', methods=['POST'])
@token_required
def create_anotacao(jogo_id):
    data = request.json
    jogo = Jogo.query.get_or_404(jogo_id)
    try:
        anotacao = Anotacao(
            jogo_id=jogo_id,
            tipo=data['tipo'],
            time_id=data.get('time_id'),
            jogador=data.get('jogador'),
            minuto=data.get('minuto'),
            descricao=data.get('descricao')
        )
        db.session.add(anotacao)
        db.session.commit()
        return jsonify({"message": "Anotação registrada", "id": anotacao.id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@bp.route('/anotacoes/<int:anotacao_id>', methods=['DELETE'])
@token_required
def delete_anotacao(anotacao_id):
    anotacao = Anotacao.query.get_or_404(anotacao_id)
    db.session.delete(anotacao)
    db.session.commit()
    return jsonify({"message": "Anotação removida"})

# --- BRACKET GENERATION ---
def get_fase_name(num_times):
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
    
    torneio = Torneio.query.get_or_404(torneio_id)
    
    # Use selected teams if available, otherwise all teams
    if torneio.times_participantes:
        team_list = list(torneio.times_participantes)
    else:
        team_list = Time.query.all()
    
    if len(team_list) < 2:
        return jsonify({"error": "É preciso ter pelo menos 2 times para gerar o chaveamento."}), 400
    
    # Clear existing games
    jogos_existentes = Jogo.query.filter_by(torneio_id=torneio_id).all()
    for j in jogos_existentes:
        Anotacao.query.filter_by(jogo_id=j.id).delete()
    Jogo.query.filter_by(torneio_id=torneio_id).delete()
    db.session.commit()
    
    random.shuffle(team_list)
    
    num_times = len(team_list)
    next_power = 2 ** math.ceil(math.log2(num_times)) if num_times > 1 else 2
    
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
    
    torneio.status = 'andamento'
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
    
    jogos = Jogo.query.filter_by(torneio_id=torneio_id).order_by(Jogo.rodada.asc()).all()
    
    if not jogos:
        return jsonify({"error": "Nenhum jogo encontrado no torneio."}), 400
    
    max_rodada = max(j.rodada for j in jogos)
    current_round_jogos = [j for j in jogos if j.rodada == max_rodada]
    
    pending = [j for j in current_round_jogos if j.status != 'finalizado']
    if pending:
        return jsonify({"error": f"Ainda há {len(pending)} jogo(s) não finalizado(s) na rodada atual."}), 400
    
    winners = []
    for j in current_round_jogos:
        if j.vencedor_id:
            winners.append(j.vencedor_id)
        elif j.placar_a > j.placar_b:
            winners.append(j.time_a_id)
        elif j.placar_b > j.placar_a:
            winners.append(j.time_b_id)
        else:
            return jsonify({"error": f"Jogo {j.id} terminou em empate. Defina o vencedor antes de avançar."}), 400
    
    if len(winners) < 2:
        # Tournament is over!
        torneio = Torneio.query.get(torneio_id)
        if torneio:
            torneio.status = 'finalizado'
            db.session.commit()
        return jsonify({"message": "🏆 Torneio finalizado! O campeão já foi definido."}), 200
    
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
