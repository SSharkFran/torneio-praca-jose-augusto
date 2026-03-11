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
    status = db.Column(db.String(20), default='agendado') # agendado, andamento, finalizado, arquivado

    jogos = db.relationship('Jogo', backref='torneio', lazy=True)

# Tabela associativa para times participantes de um torneio
torneio_times = db.Table('torneio_times',
    db.Column('torneio_id', db.Integer, db.ForeignKey('torneios.id'), primary_key=True),
    db.Column('time_id', db.Integer, db.ForeignKey('times.id'), primary_key=True)
)

class Time(db.Model):
    __tablename__ = 'times'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    sigla = db.Column(db.String(10), nullable=False, unique=True)
    responsavel = db.Column(db.String(100), nullable=True)
    escudo = db.Column(db.Text, nullable=True) # Base64 data URI
    
    torneios = db.relationship('Torneio', secondary=torneio_times, backref=db.backref('times_participantes', lazy=True))

class Jogo(db.Model):
    __tablename__ = 'jogos'
    id = db.Column(db.Integer, primary_key=True)
    torneio_id = db.Column(db.Integer, db.ForeignKey('torneios.id'), nullable=False)
    fase = db.Column(db.String(50), nullable=False)
    time_a_id = db.Column(db.Integer, db.ForeignKey('times.id'), nullable=True)
    time_b_id = db.Column(db.Integer, db.ForeignKey('times.id'), nullable=True)
    placar_a = db.Column(db.Integer, default=0)
    placar_b = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='agendado') # agendado, andamento, intervalo, finalizado
    data_hora = db.Column(db.DateTime, nullable=False)
    vencedor_id = db.Column(db.Integer, db.ForeignKey('times.id'), nullable=True)
    rodada = db.Column(db.Integer, default=1)

    time_a = db.relationship('Time', foreign_keys=[time_a_id])
    time_b = db.relationship('Time', foreign_keys=[time_b_id])
    vencedor = db.relationship('Time', foreign_keys=[vencedor_id])
    anotacoes = db.relationship('Anotacao', backref='jogo', lazy=True, cascade='all, delete-orphan')

class Anotacao(db.Model):
    __tablename__ = 'anotacoes'
    id = db.Column(db.Integer, primary_key=True)
    jogo_id = db.Column(db.Integer, db.ForeignKey('jogos.id'), nullable=False)
    tipo = db.Column(db.String(30), nullable=False)  # cartao_amarelo, cartao_vermelho, falta, substituicao, observacao
    time_id = db.Column(db.Integer, db.ForeignKey('times.id'), nullable=True)
    jogador = db.Column(db.String(100), nullable=True)  # Nome digitado pelo admin
    minuto = db.Column(db.String(10), nullable=True)  # Ex: "32'", "45+2'"
    descricao = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    time = db.relationship('Time', foreign_keys=[time_id])

class Pagamento(db.Model):
    __tablename__ = 'pagamentos'
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False)
    valor = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pendente')
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_confirmacao = db.Column(db.DateTime, nullable=True)
    token_dispositivo = db.Column(db.String(255), nullable=False)
    gateway_id = db.Column(db.String(100), nullable=True)

class Acesso(db.Model):
    __tablename__ = 'acessos'
    id = db.Column(db.Integer, primary_key=True)
    pagamento_id = db.Column(db.Integer, db.ForeignKey('pagamentos.id'), nullable=False)
    token_acesso = db.Column(db.String(255), nullable=False, unique=True)
    dispositivo = db.Column(db.String(255), nullable=False)
    data_liberacao = db.Column(db.DateTime, default=datetime.utcnow)

    pagamento = db.relationship('Pagamento', backref=db.backref('acesso_liberado', uselist=False))
