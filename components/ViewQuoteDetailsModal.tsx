
import React from 'react';
import { Quote, PricingModel } from '../types';
import Button from './common/Button';
import DocumentTextIcon from './icons/DocumentTextIcon';
import { translateQuoteStatus, formatCurrency } from '../utils'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ViewQuoteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
}

// Simplified helper for installment text, similar to the one in CreateQuotePage but localized
const getInstallmentDetailsTextForModal = (paymentMethod: string | undefined, totalAmountForInstallments: number) => {
    if (!paymentMethod || !paymentMethod.toLowerCase().includes('cartão de crédito') || !paymentMethod.includes('x') || totalAmountForInstallments <=0) {
      return '';
    }
    const match = paymentMethod.match(/(\d+)x/);
    if (match && match[1]) {
      const installments = parseInt(match[1], 10);
      if (installments > 0) {
        const installmentValue = totalAmountForInstallments / installments;
        return ` (Em ${installments}x de ${formatCurrency(installmentValue)})`;
      }
    }
    return '';
};


const ViewQuoteDetailsModal: React.FC<ViewQuoteDetailsModalProps> = ({ isOpen, onClose, quote }) => {
  if (!isOpen || !quote) {
    return null;
  }

  const {
    quoteNumber,
    status,
    createdAt,
    companyInfoSnapshot,
    clientName,
    clientContact,
    items,
    subtotal,
    discountType,
    discountValue,
    discountAmountCalculated,
    subtotalAfterDiscount,
    totalCash, 
    totalCard, 
    downPaymentApplied, 
    selectedPaymentMethod,
    paymentDate,
    deliveryDeadline,
    notes,
    salespersonFullName,
  } = quote;

  const translatedStatus = translateQuoteStatus(status);

  const effectiveTotalBeforeCredit = (selectedPaymentMethod && selectedPaymentMethod.toLowerCase().includes('cartão')) 
                                    ? totalCard 
                                    : totalCash;
  
  const creditActuallyAppliedToThisQuote = downPaymentApplied || 0;
  const finalAmountPaidOrDue = effectiveTotalBeforeCredit - creditActuallyAppliedToThisQuote;
  
  const cardInstallmentText = getInstallmentDetailsTextForModal(selectedPaymentMethod, finalAmountPaidOrDue);

  const generateOrderServicePdf = (quoteDataForOs: Quote) => {
    if (!quoteDataForOs.companyInfoSnapshot || quoteDataForOs.items.length === 0 || !quoteDataForOs.clientName) {
      alert("Informações incompletas para gerar Ordem de Serviço. Verifique dados da empresa, cliente e itens."); return;
    }
    
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const margin = 10;
    let yPos = 15; 
    const lineHeight = 4;

    // Header (Company & OS Info)
    let companyDetailsX = margin; 
    let potentialLogoHeight = 0;   
    const logoForPdf = quoteDataForOs.companyInfoSnapshot?.logoUrlLightBg; 

    if (logoForPdf && logoForPdf.startsWith('data:image')) {
        try {
            const imageMimeType = logoForPdf.substring(logoForPdf.indexOf(':') + 1, logoForPdf.indexOf(';'));
            const imageFormat = imageMimeType.split('/')[1]?.toUpperCase();
            if (imageFormat && (imageFormat === 'PNG' || imageFormat === 'JPEG' || imageFormat === 'JPG')) {
                const maxLogoDisplayWidth = 30; 
                const maxLogoDisplayHeight = 20;
                doc.addImage(logoForPdf, imageFormat, margin, yPos, maxLogoDisplayWidth, maxLogoDisplayHeight);
                companyDetailsX = margin + maxLogoDisplayWidth + 5; 
                potentialLogoHeight = maxLogoDisplayHeight; 
            }
        } catch (e) { console.error("Erro ao adicionar logo (OS PDF):", e); }
    }
    
    let textYPos = yPos; 
    if (quoteDataForOs.companyInfoSnapshot) {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
        doc.text(quoteDataForOs.companyInfoSnapshot.name, companyDetailsX, textYPos); textYPos += (lineHeight + 2);
        
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        const addressLines = doc.splitTextToSize(quoteDataForOs.companyInfoSnapshot.address || '', pageWidth - companyDetailsX - margin);
        doc.text(addressLines, companyDetailsX, textYPos);
        textYPos += (addressLines.length * lineHeight);
        
        let contactLine = '';
        if (quoteDataForOs.companyInfoSnapshot.phone) contactLine += `Tel: ${quoteDataForOs.companyInfoSnapshot.phone}`;
        if (quoteDataForOs.companyInfoSnapshot.email) contactLine += `${quoteDataForOs.companyInfoSnapshot.phone ? ' | ' : ''}Email: ${quoteDataForOs.companyInfoSnapshot.email}`;
        if (contactLine) { doc.text(contactLine, companyDetailsX, textYPos); textYPos += lineHeight; }
        
        let webLine = '';
        if (quoteDataForOs.companyInfoSnapshot.instagram) webLine += `Instagram: ${quoteDataForOs.companyInfoSnapshot.instagram}`;
        if (quoteDataForOs.companyInfoSnapshot.website) webLine += `${quoteDataForOs.companyInfoSnapshot.instagram ? ' | ' : ''}Site: ${quoteDataForOs.companyInfoSnapshot.website}`;
         if (webLine) { doc.text(webLine, companyDetailsX, textYPos); textYPos += lineHeight; }

        if (quoteDataForOs.companyInfoSnapshot.cnpj) { doc.text(`CNPJ: ${quoteDataForOs.companyInfoSnapshot.cnpj}`, companyDetailsX, textYPos); textYPos += lineHeight;}
    }
    
    const headerBlockBottomY = Math.max(textYPos, yPos + potentialLogoHeight);
    yPos = headerBlockBottomY + 5; 

    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(0,0,0);
    doc.text('ORDEM DE SERVIÇO', pageWidth - margin, yPos, { align: 'right' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    
    doc.text(`Número OS: ${quoteDataForOs.quoteNumber}`, pageWidth - margin, yPos + 6, { align: 'right' });
    doc.text(`Data Emissão: ${new Date(quoteDataForOs.createdAt).toLocaleDateString('pt-BR')}`, pageWidth - margin, yPos + 11, { align: 'right' });
    yPos += 18; 

    // Client Info
    doc.text(`Cliente: ${quoteDataForOs.clientName}`, margin, yPos); yPos += 5;
    if (quoteDataForOs.clientContact) { doc.text(`Contato: ${quoteDataForOs.clientContact}`, margin, yPos); yPos += 5; }
    if (quoteDataForOs.salespersonFullName) {
        doc.text(`Atendente: ${quoteDataForOs.salespersonFullName}`, margin, yPos); yPos += 5;
    }
    yPos += 5; 

    // Items Table
    const tableBody = quoteDataForOs.items.map(item => {
        let qtyDisplay = '';
        if (item.pricingModel === PricingModel.PER_SQUARE_METER) {
            qtyDisplay = `${item.quantity.toFixed(2)} m²`;
            if (item.width && item.height && item.itemCountForAreaCalc) {
                qtyDisplay += ` (${item.width}m x ${item.height}m x ${item.itemCountForAreaCalc}pç)`;
            }
        } else {
            // Attempt to infer unit from product name (package or individual unit)
            const productNameLower = item.productName.toLowerCase();
            let unitSuffix = 'un'; // Default unit
            if (productNameLower.includes('pacote') || productNameLower.includes('pct') || productNameLower.includes('kit')) {
              unitSuffix = 'pct';
            } else if (productNameLower.includes('bloco')) {
              unitSuffix = 'bloco';
            }
            qtyDisplay = `${item.quantity} ${unitSuffix}`;
        }
        return [
            item.productName,
            qtyDisplay,
            formatCurrency(item.unitPrice),
            formatCurrency(item.totalPrice)
        ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Serviço/Produto', 'Qtd./Detalhes', 'Preço Unit. (Base)', 'Total Item (Base)']],
      body: tableBody,
      theme: 'striped', headStyles: { fillColor: [40, 40, 40] }, bodyStyles: { textColor: [0,0,0] }, alternateRowStyles: { textColor: [0,0,0]}, margin: { left: margin, right: margin }
    });
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 10; 
    doc.setTextColor(0,0,0); 

    // Totals Section (similar to receipt)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Subtotal: ${formatCurrency(quoteDataForOs.subtotal)}`, pageWidth - margin, yPos, { align: 'right' }); yPos += 6;
    if (quoteDataForOs.discountAmountCalculated > 0) {
      doc.text(`Desconto Aplicado: ${formatCurrency(quoteDataForOs.discountAmountCalculated)}`, pageWidth - margin, yPos, { align: 'right' }); yPos += 6;
    }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(`Subtotal com Desconto: ${formatCurrency(quoteDataForOs.subtotalAfterDiscount)}`, pageWidth - margin, yPos, { align: 'right' }); yPos += 6;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    
    const osEffectiveTotalBeforeCredit = (quoteDataForOs.selectedPaymentMethod && quoteDataForOs.selectedPaymentMethod.toLowerCase().includes('cartão')) 
                                    ? quoteDataForOs.totalCard 
                                    : quoteDataForOs.totalCash;
    const osCreditApplied = quoteDataForOs.downPaymentApplied || 0;
    const osFinalAmountDue = osEffectiveTotalBeforeCredit - osCreditApplied;
    const osInstallmentText = getInstallmentDetailsTextForModal(quoteDataForOs.selectedPaymentMethod, osFinalAmountDue);

    if (quoteDataForOs.selectedPaymentMethod?.toLowerCase().includes('cartão')) {
        doc.text(`Total (Cartão - Antes do Sinal): ${formatCurrency(quoteDataForOs.totalCard)}`, pageWidth - margin, yPos, { align: 'right' }); yPos += 6;
    } else {
        doc.text(`Total (À Vista - Antes do Sinal): ${formatCurrency(quoteDataForOs.totalCash)}`, pageWidth - margin, yPos, { align: 'right' }); yPos += 6;
    }

    if (osCreditApplied > 0) {
        doc.text(`Sinal/Haver Utilizado: - ${formatCurrency(osCreditApplied)}`, pageWidth - margin, yPos, { align: 'right' }); yPos += 6;
    }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(`VALOR FINAL PAGO/A PAGAR: ${formatCurrency(osFinalAmountDue)}`, pageWidth - margin, yPos, { align: 'right' }); yPos += 8;
    if (osInstallmentText) {
        doc.setFontSize(9);
        doc.text(`${osInstallmentText}`, pageWidth - margin, yPos, { align: 'right' }); yPos += 6;
    }
    yPos += 2;

    // Payment and Delivery Info
    if (quoteDataForOs.selectedPaymentMethod) { doc.text(`Forma de Pagamento: ${quoteDataForOs.selectedPaymentMethod}${osInstallmentText}`, margin, yPos); yPos +=5; }
    if (quoteDataForOs.paymentDate) { doc.text(`Data do Pagamento: ${new Date(quoteDataForOs.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR')}`, margin, yPos); yPos +=5; }
    if (quoteDataForOs.deliveryDeadline) { doc.text(`Prazo de Entrega: ${new Date(quoteDataForOs.deliveryDeadline + 'T00:00:00').toLocaleDateString('pt-BR')}`, margin, yPos); yPos +=5; }
    
    if (quoteDataForOs.notes) {
        doc.setFontSize(9); doc.setFont('helvetica', 'italic');
        doc.text('Observações Adicionais:', margin, yPos); yPos +=4;
        const splitNotes = doc.splitTextToSize(quoteDataForOs.notes, pageWidth - (2 * margin));
        doc.text(splitNotes, margin, yPos);
        yPos += splitNotes.length * 4 + 5; 
    }

    // Signature Area
    yPos += Math.max(10, pageHeight - yPos - 50); // Ensure space for signatures or push to new page
    if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin + 10; } // Add new page if not enough space

    doc.line(margin, yPos, margin + 70, yPos); yPos += 5;
    doc.text('Assinatura Cliente', margin, yPos); yPos -=5;
    doc.line(pageWidth - margin - 70, yPos, pageWidth - margin, yPos); yPos +=5;
    doc.text('Assinatura Empresa', pageWidth - margin - 70, yPos);
    yPos += 15;

    // Footer
    if (yPos > pageHeight - 20) { doc.addPage(); yPos = margin; }
    doc.setFontSize(8); doc.setFont('helvetica', 'italic');
    doc.text('Agradecemos a sua confiança e preferência!', pageWidth / 2, pageHeight - margin - 5, { align: 'center' });

    doc.save(`Ordem_Servico-${quoteDataForOs.quoteNumber}.pdf`);
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 overflow-y-auto h-full w-full z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-800 p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto text-gray-300">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <DocumentTextIcon className="h-7 w-7 text-yellow-500 mr-3" />
            <h3 className="text-xl md:text-2xl font-semibold text-white">Detalhes do Orçamento/Pedido</h3>
          </div>
          <Button onClick={onClose} variant="secondary" size="sm">&times; Fechar</Button>
        </div>

        {/* Header Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
          <div className="bg-gray-700 p-4 rounded-md">
            <p className="font-semibold text-gray-100">Número: <span className="text-yellow-400">{quoteNumber}</span></p>
            <p>Status: <span className={`font-semibold ${status === 'accepted' || status === 'converted_to_order' ? 'text-green-400' : status === 'draft' ? 'text-yellow-400' : 'text-gray-400'}`}>{translatedStatus}</span></p>
            <p>Criado em: {new Date(createdAt).toLocaleString('pt-BR')}</p>
            {salespersonFullName && <p>Vendedor: {salespersonFullName}</p>}
          </div>
          <div className="bg-gray-700 p-4 rounded-md">
            <p className="font-semibold text-gray-100">{companyInfoSnapshot.name}</p>
            <p>{companyInfoSnapshot.phone} | {companyInfoSnapshot.email}</p>
            <p>{companyInfoSnapshot.address}</p>
            {companyInfoSnapshot.cnpj && <p>CNPJ: {companyInfoSnapshot.cnpj}</p>}
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-6 bg-gray-700 p-4 rounded-md text-sm">
            <h4 className="font-semibold text-lg text-gray-100 mb-2">Cliente</h4>
            <p>Nome: {clientName}</p>
            {clientContact && <p>Contato: {clientContact}</p>}
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <h4 className="font-semibold text-lg text-gray-100 mb-2">Itens</h4>
          <div className="overflow-x-auto border border-gray-600 rounded-md">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Produto</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Qtd./Detalhes</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Preço Unit.</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Total Item</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-600">
                {items.map((item, index) => {
                    let qtyDisplay = '';
                    if (item.pricingModel === PricingModel.PER_SQUARE_METER) {
                        qtyDisplay = `${item.quantity.toFixed(2)} m²`;
                        if(item.width && item.height && item.itemCountForAreaCalc) {
                            qtyDisplay += ` (${item.width}m x ${item.height}m x ${item.itemCountForAreaCalc}pç)`;
                        }
                    } else {
                        const productNameLower = item.productName.toLowerCase();
                        let unitSuffix = 'un'; 
                        if (productNameLower.includes('pacote') || productNameLower.includes('pct') || productNameLower.includes('kit')) {
                          unitSuffix = 'pct';
                        } else if (productNameLower.includes('bloco')) {
                          unitSuffix = 'bloco';
                        }
                        qtyDisplay = `${item.quantity} ${unitSuffix}`;
                    }
                  return (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-200">{item.productName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">{qtyDisplay}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 text-right">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="mb-6 bg-gray-700 p-4 rounded-md text-sm">
            <h4 className="font-semibold text-lg text-gray-100 mb-2">Totais</h4>
            <div className="space-y-1">
                <div className="flex justify-between"><span>Subtotal (base):</span><span>{formatCurrency(subtotal)}</span></div>
                {discountAmountCalculated > 0 && (
                <>
                    <div className="flex justify-between">
                        <span>Desconto ({discountType === 'percentage' ? `${discountValue}%` : `${formatCurrency(discountValue)}`}):</span>
                        <span className="text-red-400">- {formatCurrency(discountAmountCalculated)}</span>
                    </div>
                </>
                )}
                <div className="flex justify-between font-semibold">
                    <span>Subtotal com Desconto:</span>
                    <span>{formatCurrency(subtotalAfterDiscount)}</span>
                </div>
                <hr className="my-1 border-gray-600"/>
                <div className="flex justify-between">
                    <span className="text-gray-400">Total (À Vista - antes do sinal):</span>
                    <span className="text-gray-400">{formatCurrency(totalCash)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Total (Cartão - antes do sinal):</span>
                    <span className="text-gray-400">{formatCurrency(totalCard)}</span>
                </div>

                {creditActuallyAppliedToThisQuote > 0 && (
                     <div className="flex justify-between text-blue-400">
                        <span>Sinal/Haver Utilizado:</span>
                        <span>- {formatCurrency(creditActuallyAppliedToThisQuote)}</span>
                    </div>
                )}
                <hr className="my-1 border-gray-600"/>
                <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-100">VALOR FINAL PAGO/A PAGAR:</span>
                    <span className="text-yellow-400">{formatCurrency(finalAmountPaidOrDue)}</span>
                </div>
                 {selectedPaymentMethod?.toLowerCase().includes('cartão') && cardInstallmentText && (
                    <div className="flex justify-end text-sm text-yellow-300">
                        <span>{cardInstallmentText}</span>
                    </div>
                )}
            </div>
        </div>

        {/* Payment and Delivery Info */}
        {(selectedPaymentMethod || paymentDate || deliveryDeadline || notes) && (
            <div className="mb-6 bg-gray-700 p-4 rounded-md text-sm">
                 <h4 className="font-semibold text-lg text-gray-100 mb-2">Pagamento e Entrega</h4>
                {selectedPaymentMethod && <p>Forma de Pagamento: {selectedPaymentMethod}{cardInstallmentText}</p>}
                {paymentDate && <p>Data de Pagamento: {new Date(paymentDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                {deliveryDeadline && <p>Prazo de Entrega: {new Date(deliveryDeadline + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                {notes && (
                    <div className="mt-2">
                        <p className="font-semibold text-gray-100">Observações:</p>
                        <p className="whitespace-pre-wrap text-gray-300">{notes}</p>
                    </div>
                )}
            </div>
        )}
         <div className="mt-6 flex flex-col sm:flex-row justify-end items-center gap-3">
            {(status === 'accepted' || status === 'converted_to_order') && (
                 <Button 
                    onClick={() => generateOrderServicePdf(quote)} 
                    variant="success"
                    size="md"
                    iconLeft={<DocumentTextIcon className="w-4 h-4"/>}
                >
                    Imprimir OS
                </Button>
            )}
            <Button onClick={onClose} variant="primary" size="md">Fechar Visualização</Button>
        </div>
      </div>
    </div>
  );
};

export default ViewQuoteDetailsModal;
