import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Quote, Product, CompanyInfo, UserAccessLevel } from '../types';
import BuildingOfficeIcon from '../components/icons/BuildingOfficeIcon';
import SquaresPlusIcon from '../components/icons/SquaresPlusIcon';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';
import CurrencyDollarIcon from '../components/icons/CurrencyDollarIcon';
import PencilIcon from '../components/icons/PencilIcon';
import CheckCircleIcon from '../components/icons/CheckCircleIcon'; 
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartData, ChartOptions } from 'chart.js';
import { formatCurrency, apiGetQuotes, apiGetProducts, apiGetCompanyInfo } from '../utils';
import Spinner from '../components/common/Spinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DashboardPageProps {
  userName: string; 
  userRole: UserAccessLevel;
  openGlobalViewDetailsModal: (quote: Quote) => void; 
}

const DashboardPage: React.FC<DashboardPageProps> = ({ userName, userRole, openGlobalViewDetailsModal }) => {
  const [stats, setStats] = useState({ quoteCount: 0, productCount: 0 });
  const [draftQuotes, setDraftQuotes] = useState<Quote[]>([]);
  const [recentAcceptedQuotes, setRecentAcceptedQuotes] = useState<Quote[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [salesChartData, setSalesChartData] = useState<ChartData<'bar'>>({ labels: [], datasets: [] });
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [quotesData, productsData, companyInfoData] = await Promise.all([
          apiGetQuotes(),
          apiGetProducts(),
          apiGetCompanyInfo().catch(() => null)
        ]);

        // Process Quotes
        const allQuotes = quotesData || [];
        setStats({ quoteCount: allQuotes.length, productCount: productsData.length });

        const acceptedForChart = allQuotes.filter(q => q.status === 'accepted' || q.status === 'converted_to_order');
        setDraftQuotes(allQuotes.filter(q => q.status === 'draft').sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        const now = new Date();
        setRecentAcceptedQuotes(allQuotes.filter(q => {
          const quoteDate = new Date(q.createdAt);
          return (q.status === 'accepted' || q.status === 'converted_to_order') &&
                 quoteDate.getMonth() === now.getMonth() && quoteDate.getFullYear() === now.getFullYear();
        }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        // Process Company Info
        setCompanyName(companyInfoData?.name || 'Sua Empresa');

        // Process Chart Data
        if (acceptedForChart.length > 0) {
          const years = [...new Set(acceptedForChart.map(q => new Date(q.createdAt).getFullYear()))].sort((a,b) => b-a);
          setAvailableYears(years);
          updateChartData(acceptedForChart, selectedYear);
        } else {
          setAvailableYears([new Date().getFullYear()]);
          updateChartData([], selectedYear); // To show empty chart
        }

      } catch (err: any) {
        setError(err.message || "Falha ao carregar dados do painel.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]); 

  const updateChartData = (acceptedQuotes: Quote[], year: number) => {
    const yearlySales = acceptedQuotes.filter(q => new Date(q.createdAt).getFullYear() === year);
    const monthlySales: number[] = Array(12).fill(0);
    yearlySales.forEach(quote => {
      const month = new Date(quote.createdAt).getMonth(); 
      monthlySales[month] += quote.totalCash; 
    });
    setSalesChartData({
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      datasets: [{
        label: `Vendas (${year})`,
        data: monthlySales,
        backgroundColor: 'rgba(234, 179, 8, 0.7)', 
        borderColor: 'rgba(234, 179, 8, 1)', 
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(234, 179, 8, 1)',
      }],
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#d1d5db', font: { family: 'Inter' } } },
      title: { display: true, text: `Resumo Mensal de Vendas (${selectedYear})`, color: '#f3f4f6', font: { size: 16, family: 'Inter', weight: 600 } },
      tooltip: {
        backgroundColor: '#1f2937', titleColor: '#f3f4f6', bodyColor: '#d1d5db',
        callbacks: { label: (context) => `${context.dataset.label || ''}: ${formatCurrency(context.parsed.y)}` }
      }
    },
    scales: {
      x: { ticks: { color: '#9ca3af', font: { family: 'Inter' } }, grid: { color: 'rgba(75, 85, 99, 0.3)' } },
      y: { ticks: { color: '#9ca3af', font: { family: 'Inter' }, callback: (value) => formatCurrency(Number(value)) }, grid: { color: 'rgba(75, 85, 99, 0.5)' }, beginAtZero: true }
    }
  };
  
  const yearOptions = availableYears.map(year => ({ value: year, label: year.toString() }));

  if (isLoading) return <div className="p-6 text-center"><Spinner size="lg" /></div>;
  if (error) return <div className="p-6 text-center text-red-500 bg-red-900/20 rounded-md">{error}</div>;

  return (
    <div className="p-6 text-gray-300">
      <h1 className="text-3xl font-semibold text-white mb-2">{getGreeting()}, {userName}!</h1>
      <p className="text-gray-400 mb-8">Bem-vindo(a) ao painel de controle da {companyName}.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link to="/products" className="block p-6 bg-gray-800 rounded-xl shadow-lg hover:bg-gray-700/50 transition-all"><div className="flex items-center"><SquaresPlusIcon className="h-10 w-10 text-yellow-500 mr-4" /><div><p className="text-3xl font-bold text-white">{stats.productCount}</p><p className="text-gray-400">Produtos</p></div></div></Link>
        <Link to="/quotes/all" className="block p-6 bg-gray-800 rounded-xl shadow-lg hover:bg-gray-700/50 transition-all"><div className="flex items-center"><DocumentTextIcon className="h-10 w-10 text-yellow-400 mr-4" /><div><p className="text-3xl font-bold text-white">{stats.quoteCount}</p><p className="text-gray-400">Orçamentos</p></div></div></Link>
        {userRole === UserAccessLevel.ADMIN && (<Link to="/settings" className="block p-6 bg-gray-800 rounded-xl shadow-lg hover:bg-gray-700/50 transition-all"><div className="flex items-center"><BuildingOfficeIcon className="h-10 w-10 text-yellow-300 mr-4" /><div><p className="text-xl font-semibold text-white">Configurar Empresa</p><p className="text-gray-400">Dados e logo</p></div></div></Link>)}
      </div>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
        <div className="flex items-center mb-4"><CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" /><h2 className="text-xl font-semibold text-white">Fechados Este Mês</h2></div>
        {recentAcceptedQuotes.length > 0 ? (<div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-700">... (table rendering unchanged) ...</table></div>) : (<p className="text-gray-400">Nenhum orçamento fechado este mês.</p>)}
      </div>
      
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
        <div className="flex items-center mb-4"><PencilIcon className="h-6 w-6 text-yellow-500 mr-2" /><h2 className="text-xl font-semibold text-white">Orçamentos em Aberto</h2></div>
        {draftQuotes.length > 0 ? (<div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-700">... (table rendering unchanged) ...</table></div>) : (<p className="text-gray-400">Nenhum orçamento em aberto.</p>)}
      </div>
      
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center"><CurrencyDollarIcon className="h-6 w-6 text-yellow-500 mr-2" /><h2 className="text-xl font-semibold text-white">Vendas Realizadas</h2></div>
          <div className="w-40"><Select label="Ano:" options={yearOptions} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} /></div>
        </div>
        <div className="h-80 md:h-96 relative">
          {salesChartData.datasets[0]?.data.some(d => typeof d === 'number' && d > 0) ? (<Bar options={chartOptions} data={salesChartData} />) : (<div className="flex items-center justify-center h-full"><p className="text-gray-500">Nenhuma venda em {selectedYear}.</p></div>)}
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => navigate('/quotes/new')} variant="primary">Novo Orçamento</Button>
          <Button onClick={() => navigate('/products')} variant="secondary">Ver Produtos</Button>
          <Button onClick={() => navigate('/customers')} variant="secondary">Ver Clientes</Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;