import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Quote, UserAccessLevel } from '../types';
import BuildingOfficeIcon from '../components/icons/BuildingOfficeIcon';
import SquaresPlusIcon from '../components/icons/SquaresPlusIcon';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';
import CurrencyDollarIcon from '../components/icons/CurrencyDollarIcon';
import PencilIcon from '../components/icons/PencilIcon';
import CheckCircleIcon from '../components/icons/CheckCircleIcon';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  Scriptable,
  ScriptableContext
} from 'chart.js';
import { formatCurrency } from '../utils';
import { api } from '../services/apiService';
import Spinner from '../components/common/Spinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardPageProps {
  userName: string;
  userRole: UserAccessLevel;
  openGlobalViewDetailsModal: (quote: Quote) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ userName, userRole, openGlobalViewDetailsModal }) => {
  const [stats, setStats] = useState({ productCount: 0, quoteCount: 0, companyName: 'Sua Empresa' });
  const [draftQuotes, setDraftQuotes] = useState<Quote[]>([]);
  const [recentAcceptedQuotes, setRecentAcceptedQuotes] = useState<Quote[]>([]);
  const [salesChartData, setSalesChartData] = useState<ChartData<'bar'>>({ labels: [], datasets: [] });
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, draftsData, recentsData] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/dashboard/draft-quotes'),
        api.get('/api/dashboard/recent-accepted-quotes'),
      ]);
      setStats(statsData);
      setDraftQuotes(draftsData);
      setRecentAcceptedQuotes(recentsData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      alert("Falha ao carregar dados do painel.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchChartData = useCallback(async () => {
    try {
      const chartData = await api.get(`/api/dashboard/sales-chart?year=${selectedYear}`);
      setAvailableYears(chartData.availableYears);
      
      const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      setSalesChartData({
        labels: monthLabels,
        datasets: [
          {
            label: `Vendas (${selectedYear})`,
            data: chartData.monthlySales,
            backgroundColor: 'rgba(234, 179, 8, 0.7)',
            borderColor: 'rgba(234, 179, 8, 1)',
            borderWidth: 1,
            borderRadius: 4,
            hoverBackgroundColor: 'rgba(234, 179, 8, 1)',
          },
        ],
      });
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#f3f4f6', font: { family: 'Inter' } } },
      title: { display: true, text: `Resumo Mensal de Vendas (${selectedYear})`, color: '#f3f4f6', font: { size: 16, family: 'Inter', weight: 600 as Scriptable<number | "bold" | "normal" | "lighter" | "bolder", ScriptableContext<'bar'>> } },
      tooltip: {
        backgroundColor: '#000000', titleColor: '#f3f4f6', bodyColor: '#d1d5db',
        callbacks: {
            label: function(context) {
                return `${context.dataset.label || ''}: ${formatCurrency(context.parsed.y)}`;
            }
        }
      }
    },
    scales: {
      x: { ticks: { color: '#d1d5db', font: { family: 'Inter' } }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
      y: { ticks: { color: '#d1d5db', font: { family: 'Inter' }, callback: (value) => formatCurrency(Number(value)) }, grid: { color: 'rgba(255, 255, 255, 0.1)' }, beginAtZero: true }
    }
  };

  const yearOptions = availableYears.length > 0 ? availableYears.map(year => ({ value: year, label: year.toString() })) : [{ value: new Date().getFullYear(), label: new Date().getFullYear().toString() }];
  
  if (isLoading) {
    return <div className="p-6 flex justify-center items-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-semibold text-white mb-2">{getGreeting()}, {userName}!</h1>
      <p className="text-gray-300 mb-8">Bem-vindo(a) ao painel de controle da {stats.companyName}.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link to="/products" className="block p-6 bg-[#1d1d1d] rounded-xl shadow-lg hover:shadow-xl hover:bg-[#282828] transition-all">
          <div className="flex items-center">
            <SquaresPlusIcon className="h-10 w-10 text-yellow-500 mr-4" />
            <div>
              <p className="text-3xl font-bold text-white">{stats.productCount}</p>
              <p className="text-gray-300">Produtos Cadastrados</p>
            </div>
          </div>
        </Link>
        <Link to="/quotes/all" className="block p-6 bg-[#1d1d1d] rounded-xl shadow-lg hover:shadow-xl hover:bg-[#282828] transition-all">
          <div className="flex items-center">
            <DocumentTextIcon className="h-10 w-10 text-yellow-400 mr-4" />
            <div>
              <p className="text-3xl font-bold text-white">{stats.quoteCount}</p>
              <p className="text-gray-300">Orçamentos Criados</p>
            </div>
          </div>
        </Link>
        {userRole === UserAccessLevel.ADMIN && (
            <Link to="/settings" className="block p-6 bg-[#1d1d1d] rounded-xl shadow-lg hover:shadow-xl hover:bg-[#282828] transition-all">
            <div className="flex items-center">
                <BuildingOfficeIcon className="h-10 w-10 text-yellow-300 mr-4" />
                <div>
                <p className="text-xl font-semibold text-white">Configurar Empresa</p>
                <p className="text-gray-300">Gerenciar dados e logo</p>
                </div>
            </div>
            </Link>
        )}
      </div>

       <div className="bg-[#1d1d1d] p-6 rounded-xl shadow-lg mb-8">
        <div className="flex items-center mb-4">
            <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
            <h2 className="text-xl font-semibold text-white">Orçamentos Fechados Este Mês</h2>
        </div>
        {recentAcceptedQuotes.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#282828]">
                    <thead className="bg-[#282828]"><tr /* ... */>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Número</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Data</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Valor</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase">Ação</th>
                    </tr></thead>
                    <tbody className="bg-[#1d1d1d] divide-y divide-[#282828]">
                        {recentAcceptedQuotes.map(quote => (
                            <tr key={quote.id} className="hover:bg-[#3a3a3a]">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-400">{quote.quoteNumber}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{quote.clientName}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{new Date(quote.createdAt).toLocaleDateString('pt-BR')}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200 text-right">{formatCurrency(quote.totalCash)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                    <Button onClick={() => openGlobalViewDetailsModal(quote)} variant="outline" size="sm">Ver</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : <p className="text-gray-400">Nenhum orçamento fechado este mês.</p>}
      </div>
      
      <div className="bg-[#1d1d1d] p-6 rounded-xl shadow-lg mb-8">
        <div className="flex items-center mb-4">
            <PencilIcon className="h-6 w-6 text-yellow-500 mr-2" />
            <h2 className="text-xl font-semibold text-white">Rascunhos Recentes</h2>
        </div>
        {draftQuotes.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#282828]">
                     <thead className="bg-[#282828]"><tr /* ... */>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Número</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Data</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Valor</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase">Ação</th>
                    </tr></thead>
                    <tbody className="bg-[#1d1d1d] divide-y divide-[#282828]">
                        {draftQuotes.map(quote => (
                            <tr key={quote.id} className="hover:bg-[#3a3a3a]">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-yellow-400">{quote.quoteNumber}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{quote.clientName}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{new Date(quote.createdAt).toLocaleDateString('pt-BR')}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200 text-right">{formatCurrency(quote.totalCash)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                    <Button onClick={() => navigate(`/quotes/edit/${quote.id}`)} variant="outline" size="sm" iconLeft={<PencilIcon className="w-4 h-4"/>}>Editar</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : <p className="text-gray-400">Nenhum rascunho encontrado.</p>}
      </div>

      <div className="bg-[#1d1d1d] p-6 rounded-xl shadow-lg mb-8">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
                <CurrencyDollarIcon className="h-6 w-6 text-yellow-500 mr-2" />
                <h2 className="text-xl font-semibold text-white">Vendas Realizadas</h2>
            </div>
            <div className="w-40">
                 <Select label="Ano:" options={yearOptions} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="text-sm bg-black" />
            </div>
        </div>
        <div className="h-80 md:h-96 relative">
          {salesChartData.datasets.length > 0 && salesChartData.datasets[0].data.some(d => typeof d === 'number' && d > 0) ? (
            <Bar options={chartOptions} data={salesChartData} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Nenhuma venda realizada para o ano de {selectedYear}.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#1d1d1d] p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-4">
          <Link to="/quotes/new"><Button variant="primary">Novo Orçamento</Button></Link>
          <Link to="/products"><Button variant="secondary">Ver Produtos</Button></Link>
          <Link to="/customers"><Button variant="secondary">Ver Clientes</Button></Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
