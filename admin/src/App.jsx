import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ManageGames from './pages/ManageGames';
import PublicFeed from './pages/PublicFeed';
import Login from './pages/Login';
import ManageTeams from './pages/ManageTeams';
import DownloadPage from './pages/DownloadPage';
import BracketView from './pages/BracketView';
import { LayoutDashboard, Trophy, Users, LogOut, GitBranch } from 'lucide-react';

function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-6">
      <div className="flex items-center gap-3 mb-10">
        <Trophy className="text-blue-500" size={32} />
        <div>
           <h2 className="text-xl font-bold">Admin</h2>
           <p className="text-xs text-gray-400">Torneio José Augusto</p>
        </div>
      </div>
      
      <nav className="space-y-2">
        <Link to="/" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <LayoutDashboard size={20} className="text-gray-400" />
          <span className="font-medium">Dashboard</span>
        </Link>
        <Link to="/jogos" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <Trophy size={20} className="text-gray-400" />
          <span className="font-medium">Gerenciar Jogos</span>
        </Link>
        <Link to="/times" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
           <Users size={20} className="text-gray-400" />
           <span className="font-medium">Gerenciar Times</span>
        </Link>
        <Link to="/chaveamento" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
           <GitBranch size={20} className="text-gray-400" />
           <span className="font-medium">Chaveamento</span>
        </Link>
      </nav>
      
      <div className="absolute flex bottom-0 w-64 left-0 p-6">
        <button 
          onClick={() => { localStorage.removeItem('admin_token'); window.location.href = '/login'; }} 
          className="flex items-center gap-3 w-full p-3 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut size={20} /> Sair do Painel
        </button>
      </div>
    </div>
  );
}

const PrivateRoute = ({ children }) => {
  const isAuth = !!localStorage.getItem('admin_token');
  return isAuth ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rota Exclusiva do WebView do App Movél (Sem Sidebar) */}
        <Route path="/app" element={<PublicFeed />} />
        
        {/* Rota de Download do App para Usuários Web */}
        <Route path="/baixar-app" element={<DownloadPage />} />

        {/* Rota pública do Chaveamento */}
        <Route path="/bracket" element={<BracketView />} />
        
        {/* Rotas Administrativas (Com Sidebar e Protegidas) */}
        <Route path="*" element={
          <PrivateRoute>
            <div className="flex min-h-screen bg-gray-50 font-sans">
              <Sidebar />
              <main className="flex-1 overflow-y-auto w-full">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/jogos" element={<ManageGames />} />
                  <Route path="/times" element={<ManageTeams />} />
                  <Route path="/chaveamento" element={<BracketView />} />
                </Routes>
              </main>
            </div>
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
