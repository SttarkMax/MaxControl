
import React, { useState, useEffect, useMemo } from 'react';
import { User, Quote, LoggedInUser, UserAccessLevel } from '../types';
import Select from '../components/common/Select';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import UserGroupIcon from '../components/icons/UserGroupIcon';
import { apiGetUsers, apiGetQuotes } from '../utils';
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
} from 'chart.js';
import { formatCurrency } from '../utils';
import Spinner from '../components/common/Spinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface UserSalesPerformancePageProps {
  currentUser: LoggedInUser;
}

const UserSalesPerformancePage: React.FC<UserSalesPerformancePageProps> = ({ currentUser }) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allAcceptedQuotes, setAllAcceptedQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12

  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [usersData, quotesData] = await Promise.all([
                apiGetUsers(),
                apiGetQuotes(),
            ]);

            setAllUsers(usersData);
            const acceptedQuotes = quotesData.filter(q => q.status === 'accepted' || q.status === 'converted_to_order');
            setAllAcceptedQuotes(acceptedQuotes);

            if (acceptedQuotes.length > 0) {
                const yearsWithSales = [...new Set(acceptedQuotes.map(q => new Date(q.createdAt).getFullYear()))].sort((a, b) => b - a);
                const allPossibleYears = [...new Set([...yearsWithSales, new Date().getFullYear()])].sort((a,b) => b-a);
                setAvailableYears(allPossibleYears);
            } else {
                setAvailableYears([new Date().getFullYear()]);
            }
        } catch (err: any) {
            setError(err.message || 'Falha ao carregar dados de desempenho.');
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, []);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }),
  }));

  const yearOptions = availableYears.map(year => ({ value: year, label: year.toString() }));

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const salesDataPerUser = useMemo(() => {
    return allUsers.map(user => {
      const userSales = allAcceptedQuotes.filter(quote => {
        const quoteDate = new Date(quote.createdAt);
        return quote.salespersonUsername === user.username &&
               quoteDate.getFullYear() === selectedYear &&
               (quoteDate.getMonth() + 1) === selectedMonth;
      });

      const daysInSelectedMonth = getDaysInMonth(selectedYear, selectedMonth);
      const dailySales = Array(daysInSelectedMonth).fill(0);
      const dayLabels = Array.from({ length: daysInSelectedMonth }, (_, i) => (i + 1).toString());

      userSales.forEach(quote => {
        const dayOfMonth = new Date(quote.createdAt).getDate(); // 1-31
        dailySales[dayOfMonth - 1] += quote.totalCash;
      });
      
      const hasSales = dailySales.some(sale => sale > 0);

      return {
        userId: user.id,
        userName: user.fullName || user.username,
        hasSales,
        chartData: {
          labels: dayLabels,
          datasets: [
            {
              label: `Vendas Diárias (${formatCurrency(dailySales.reduce((a,b) => a+b,0))})`,
              data: dailySales,
              backgroundColor: 'rgba(234, 179, 8, 0.6)',
              borderColor: 'rgba(234, 179, 8, 1)',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        } as ChartData<'bar'>,
      };
    });
  }, [allUsers, allAcceptedQuotes, selectedYear, selectedMonth]);

  const chartBaseOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#d1d5db', font: { family: 'Inter' } } },
      tooltip: {
        backgroundColor: '#1f2937', titleColor: '#f3f4f6', bodyColor: '#d1d5db',
        callbacks: {
          label: (context) => `Total Dia ${context.label}: ${formatCurrency(context.parsed.y)}`
        }
      }
    },
    scales: {
      x: { ticks: { color: '#9ca3af', font: { family: 'Inter' } }, grid: { color: 'rgba(75, 85, 99, 0.2)' } },
      y: { ticks: { color: '#9ca3af', font: { family: 'Inter' }, callback: value => formatCurrency(Number(value)) }, grid: { color: 'rgba(75, 85, 99, 0.3)' }, beginAtZero: true }
    }
  };
  
  if (isLoading) return <div className="p-6 text-center"><Spinner size="lg" /></div>;
  if (error) return <div className="p-6 text-center text-red-500 bg-red-900/20 rounded-md">{error}</div>;

  const noSalesDataForPeriod = salesDataPerUser.every(data => !data.hasSales);

  return (
    <div className="p-6 text-gray-300">
      <div className="flex items-center mb-6">
        <ChartBarIcon className="h-8 w-8 text-yellow-500 mr-3" />
        <h2 className="text-2xl font-semibold text-white">Desempenho de Vendas por Usuário</h2>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Select label="Mês:" options={monthOptions} value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} />
          <Select label="Ano:" options={yearOptions} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} />
        </div>
      </div>

      {allUsers.length === 0 ? (
        <div className="text-center py-10 bg-gray-800 shadow-xl rounded-lg">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">Nenhum usuário cadastrado</h3>
          <p className="mt-1 text-sm text-gray-400">Adicione usuários para ver seus desempenhos.</p>
        </div>
      ) : noSalesDataForPeriod ? (
         <div className="text-center py-10 bg-gray-800 shadow-xl rounded-lg">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-white">Nenhuma Venda no Período</h3>
            <p className="mt-1 text-sm text-gray-400">Não há orçamentos aceitos para {monthOptions.find(m => m.value === selectedMonth)?.label} de {selectedYear}.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {salesDataPerUser.map(data => (
            <div key={data.userId} className="bg-gray-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-semibold text-yellow-300 mb-1">{data.userName}</h3>
              <p className="text-xs text-gray-400 mb-4">Vendas em {monthOptions.find(m => m.value === selectedMonth)?.label} de {selectedYear}</p>
              {data.hasSales ? (
                <div className="h-72 md:h-96 relative">
                  <Bar options={chartBaseOptions} data={data.chartData} />
                </div>
              ) : (
                <p className="text-gray-500 text-center py-10">Nenhuma venda encontrada para este usuário no período.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSalesPerformancePage;
