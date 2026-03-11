from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()

class Torneio(db.Model):
    __tablename__ = 'torneios'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    local = db.Column(db.String(100), nullable=False)
    data_inicio = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='agendado') # agendado, andamento, finalizado

    jogos = db.relationship('Jogo', backref='torneio', lazy=True)

class Time(db.Model):
    __tablename__ = 'times'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    sigla = db.Column(db.String(10), nullable=False, unique=True)
    responsavel = db.Column(db.String(100), nullable=True)
    escudo = db.Column(db.String(255), nullable=True) # URL ou Path
    
class Jogo(db.Model):
    __tablename__ = 'jogos'
    id = db.Column(db.Integer, primary_key=True)
    torneio_id = db.Column(db.Integer, db.ForeignKey('torneios.id'), nullable=False)
    fase = db.Column(db.String(50), nullable=False) # grupos, oitavas, quartas, semi, final
    time_a_id = db.Column(db.Integer, db.ForeignKey('times.id'), nullable=True) # Pode ser null inicialmente no chaveamento
    time_b_id = db.Column(db.Integer, db.ForeignKey('times.id'), nullable=True)
    placar_a = db.Column(db.Integer, default=0)
    placar_b = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='agendado') # agendado, andamento, intervalo, finalizado
    data_hora = db.Column(db.DateTime, nullable=False)
    vencedor_id = db.Column(db.Integer, db.ForeignKey('times.id'), nullable=True)
    rodada = db.Column(db.Integer, default=1)  # Round number for bracket tracking

    time_a = db.relationship('Time', foreign_keys=[time_a_id])
    time_b = db.relationship('Time', foreign_keys=[time_b_id])
    vencedor = db.relationship('Time', foreign_keys=[vencedor_id])

class Pagamento(db.Model):
    __tablename__ = 'pagamentos'
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False)
    valor = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pendente') # pendente, aprovado, cancelado
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_confirmacao = db.Column(db.DateTime, nullable=True)
    token_dispositivo = db.Column(db.String(255), nullable=False)
    # ID opcional do gateway (ex: Mercado Pago ID) para conciliação
    gateway_id = db.Column(db.String(100), nullable=True)

class Acesso(db.Model):
    __tablename__ = 'acessos'
    id = db.Column(db.Integer, primary_key=True)
    pagamento_id = db.Column(db.Integer, db.ForeignKey('pagamentos.id'), nullable=False)
    token_acesso = db.Column(db.String(255), nullable=False, unique=True)
    dispositivo = db.Column(db.String(255), nullable=False) # Token ou Hash que identifica
    data_liberacao = db.Column(db.DateTime, default=datetime.utcnow)

    pagamento = db.relationship('Pagamento', backref=db.backref('acesso_liberado', uselist=False))
