from app import create_app, db
from app.models import Torneio
from datetime import date
import os
from sqlalchemy import inspect, text

app = create_app()

with app.app_context():
    # Cria as tabelas do banco de dados caso não existam
    db.create_all()
    print("Banco de dados verificado/criado com sucesso.")
    
    # Migrate: Add rodada column if it doesn't exist
    inspector = inspect(db.engine)
    columns = [col['name'] for col in inspector.get_columns('jogos')]
    if 'rodada' not in columns:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE jogos ADD COLUMN rodada INTEGER DEFAULT 1'))
            conn.commit()
        print("Migração: coluna 'rodada' adicionada à tabela 'jogos'.")
    
    # Adicionar dados iniciais de teste se o banco estiver vazio
    if Torneio.query.count() == 0:
        t = Torneio(nome="Torneio Praça José Augusto", local="Quadra José Augusto", data_inicio=date.today())
        db.session.add(t)
        db.session.commit()
        print("Torneio inicial criado!")
