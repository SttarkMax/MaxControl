import React, { useState, useEffect } from 'react';
import { CompanyInfo } from '../types';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Button from '../components/common/Button';
import BuildingOfficeIcon from '../components/icons/BuildingOfficeIcon';
import { api } from '../services/apiService';
import Spinner from '../components/common/Spinner';

interface CompanySettingsPageProps {
  onUpdate: () => void;
}

const CompanySettingsPage: React.FC<CompanySettingsPageProps> = ({ onUpdate }) => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      setIsLoading(true);
      try {
        const info = await api.get('/api/settings/company-info');
        setCompanyInfo(info);
      } catch (error) {
        console.error("Failed to load company info:", error);
        setSaveStatus({ message: 'Falha ao carregar informações da empresa.', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInfo();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!companyInfo) return;
    setCompanyInfo({ ...companyInfo, [e.target.name]: e.target.value });
    setSaveStatus(null);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>, logoType: 'dark' | 'light') => {
    if (!companyInfo) return;
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB size limit
        setSaveStatus({ message: "O arquivo da logo não pode exceder 2MB.", type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const fieldName = logoType === 'dark' ? 'logoUrlDarkBg' : 'logoUrlLightBg';
        setCompanyInfo({ ...companyInfo, [fieldName]: reader.result as string });
        setSaveStatus(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyInfo) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const updatedInfo = await api.put('/api/settings/company-info', companyInfo);
      setCompanyInfo(updatedInfo);
      setSaveStatus({ message: 'Informações salvas com sucesso!', type: 'success' });
      onUpdate(); // Notify App.tsx to refetch
      localStorage.setItem('companyInfoUpdated', Date.now().toString()); // Notify other tabs
    } catch (error: any) {
      setSaveStatus({ message: `Erro ao salvar: ${error.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!companyInfo) {
    return (
      <div className="p-6 bg-[#1d1d1d] shadow-xl rounded-lg text-white">
        <p className="text-red-500">Não foi possível carregar as informações da empresa. Tente recarregar a página.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#1d1d1d] shadow-xl rounded-lg text-white">
      <div className="flex items-center mb-6">
        <BuildingOfficeIcon className="h-8 w-8 text-yellow-500 mr-3" />
        <h2 className="text-2xl font-semibold text-white">Informações da Empresa</h2>
      </div>

      {saveStatus && (
        <div className={`mb-4 p-3 rounded-md ${saveStatus.type === 'success' ? 'bg-green-600 border-green-700' : 'bg-red-600 border-red-700'} text-white`}>
          {saveStatus.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Nome da Empresa"
          id="name"
          name="name"
          type="text"
          value={companyInfo.name}
          onChange={handleChange}
          required
        />
        
        <div className="space-y-6">
          <div>
            <label htmlFor="logoUrlDarkBg" className="block text-sm font-medium text-gray-200 mb-1">Logo para Fundo Escuro (Topo do Site)</label>
            {companyInfo.logoUrlDarkBg && (
              <img src={companyInfo.logoUrlDarkBg} alt="Logo Dark Preview" className="h-20 mb-2 border border-[#282828] rounded p-1 bg-black"/>
            )}
            <Input
              id="logoUrlDarkBg"
              name="logoUrlDarkBg"
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoChange(e, 'dark')}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-600"
            />
             <p className="mt-1 text-xs text-gray-400">Ideal para o cabeçalho do site. PNG, JPG, GIF até 2MB. Recomendado: logo claro ou com contorno para boa visualização em fundos escuros.</p>
          </div>

          <div>
            <label htmlFor="logoUrlLightBg" className="block text-sm font-medium text-gray-200 mb-1">Logo para Fundo Claro (PDFs)</label>
            {companyInfo.logoUrlLightBg && (
              <img src={companyInfo.logoUrlLightBg} alt="Logo Light Preview" className="h-20 mb-2 border border-gray-600 rounded p-1 bg-white"/> /* Preview on white bg */
            )}
            <Input
              id="logoUrlLightBg"
              name="logoUrlLightBg"
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoChange(e, 'light')}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-600"
            />
             <p className="mt-1 text-xs text-gray-400">Ideal para orçamentos e recibos em PDF. PNG, JPG, GIF até 2MB. Recomendado: logo escuro ou colorido para boa visualização em fundos claros.</p>
          </div>
        </div>

        <Textarea
          label="Endereço"
          id="address"
          name="address"
          value={companyInfo.address}
          onChange={handleChange}
          rows={3}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Telefone"
            id="phone"
            name="phone"
            type="tel"
            value={companyInfo.phone}
            onChange={handleChange}
          />
          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            value={companyInfo.email}
            onChange={handleChange}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Input
            label="Instagram (Opcional)"
            id="instagram"
            name="instagram"
            type="text"
            value={companyInfo.instagram || ''}
            onChange={handleChange}
            placeholder="Ex: @suaempresa ou https://instagram.com/suaempresa"
          />
          <Input
            label="Website (Opcional)"
            id="website"
            name="website"
            type="url"
            value={companyInfo.website || ''}
            onChange={handleChange}
            placeholder="Ex: https://www.suaempresa.com.br"
          />
        </div>
        <Input
          label="CNPJ (Opcional)"
          id="cnpj"
          name="cnpj"
          type="text"
          value={companyInfo.cnpj || ''}
          onChange={handleChange}
        />
        
        <div className="pt-4">
          <Button type="submit" variant="primary" size="lg" isLoading={isSaving} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Informações'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CompanySettingsPage;
