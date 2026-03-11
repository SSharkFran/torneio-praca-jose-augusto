import os
from flask import Flask, redirect
from flask_cors import CORS
from .models import db

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    
    # Configuração Padrão
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-secret-key-torneio'),
        SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL', 'sqlite:///torneio.db'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )
    
    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)

    # Inicializar Extensions
    db.init_app(app)
    CORS(app)

    with app.app_context():
        db.create_all()
        # Auto-migrate: add rodada column if missing
        from sqlalchemy import inspect, text
        inspector = inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('jogos')]
        if 'rodada' not in columns:
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE jogos ADD COLUMN rodada INTEGER DEFAULT 1'))
                conn.commit()
        
    # Registrar Blueprints
    from .routes import admin_routes, public_routes, payment_routes, auth_routes
    app.register_blueprint(admin_routes.bp)
    app.register_blueprint(public_routes.bp)
    app.register_blueprint(payment_routes.bp)
    app.register_blueprint(auth_routes.bp)
    
    @app.route('/health')
    def health_check():
        return {'status': 'ok'}

    @app.route('/')
    def root():
        return redirect('https://gleaming-spontaneity-projetos.up.railway.app/app')

    @app.route('/api')
    def api_info():
        return {'service': 'Torneio Praça José Augusto API', 'version': '1.0', 'status': 'online'}

    return app
