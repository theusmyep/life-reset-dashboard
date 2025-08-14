document.addEventListener('DOMContentLoaded', () => {
    const DATA_FILE = 'data.json';
    const errorContainer = document.getElementById('error-container');
    let allData = [];

    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }

    function hideError() {
        errorContainer.style.display = 'none';
    }

    function processDataForPeriod(period) {
        hideError();
        
        // --- Lógica para os Cards ---
        const cardEndDate = new Date();
        const cardStartDate = new Date();

        if (period === 'yesterday') {
            cardStartDate.setDate(cardEndDate.getDate() - 1);
            cardEndDate.setDate(cardEndDate.getDate() - 1);
        } else {
            cardStartDate.setDate(cardEndDate.getDate() - (parseInt(period, 10) - 1));
        }
        
        cardEndDate.setHours(23, 59, 59, 999);
        cardStartDate.setHours(0, 0, 0, 0);

        const cardFilteredData = allData.filter(item => {
            const dateParts = item.data.split('/');
            if (dateParts.length !== 3) return false;
            const rowDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
            return rowDate >= cardStartDate && rowDate <= cardEndDate;
        });

        if (cardFilteredData.length === 0) {
            const periodText = period === 'yesterday' ? 'ontem' : `nos últimos ${period} dia(s)`;
            showError(`Nenhum dado encontrado para ${periodText}.`);
            updateDashboard(null);
        } else {
            const totals = cardFilteredData.reduce((acc, item) => {
                acc.leads_rd += item.leads_rd || 0;
                acc.cpl_rd_sum += item.cpl_rd || 0;
                if (item.cpl_rd > 0) acc.cpl_rd_count++;
                acc.leads_meta += item.leads_meta || 0;
                acc.cpl_meta_sum += item.cpl_meta || 0;
                if (item.cpl_meta > 0) acc.cpl_meta_count++;
                acc.leads_anuncios += item.leads_anuncios || 0;
                acc.leads_instagram += item.leads_instagram || 0;
                acc.investimento_total += item.investimento_total || 0;
                return acc;
            }, {
                leads_rd: 0, cpl_rd_sum: 0, cpl_rd_count: 0,
                leads_meta: 0, cpl_meta_sum: 0, cpl_meta_count: 0,
                leads_anuncios: 0, leads_instagram: 0, investimento_total: 0
            });

            totals.cpl_rd = totals.cpl_rd_count > 0 ? totals.cpl_rd_sum / totals.cpl_rd_count : 0;
            totals.cpl_meta = totals.cpl_meta_count > 0 ? totals.cpl_meta_sum / totals.cpl_meta_count : 0;
            updateDashboard(totals);
        }

        // --- Lógica para o Gráfico (Sempre últimos 7 dias) ---
        const chartEndDate = new Date();
        const chartStartDate = new Date();
        chartStartDate.setDate(chartEndDate.getDate() - 6);
        chartEndDate.setHours(23, 59, 59, 999);
        chartStartDate.setHours(0, 0, 0, 0);

        const chartFilteredData = allData.filter(item => {
            const dateParts = item.data.split('/');
            if (dateParts.length !== 3) return false;
            const rowDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
            return rowDate >= chartStartDate && rowDate <= chartEndDate;
        });
        
        updateChart(chartFilteredData);
    }

    function updateDashboard(data) {
        if (!data) {
            const fields = ['leads-rd-station', 'cpl-rd-station', 'leads-meta-ads', 'cpl-meta-ads', 'leads-anuncios', 'leads-instagram', 'investimento-total'];
            fields.forEach(id => document.getElementById(id).textContent = id.includes('cpl') || id.includes('investimento') ? 'R$ 0,00' : '0');
            return;
        }
        document.getElementById('leads-rd-station').textContent = data.leads_rd.toLocaleString('pt-BR');
        document.getElementById('cpl-rd-station').textContent = `R$ ${data.cpl_rd.toFixed(2).replace('.', ',')}`;
        document.getElementById('leads-meta-ads').textContent = data.leads_meta.toLocaleString('pt-BR');
        document.getElementById('cpl-meta-ads').textContent = `R$ ${data.cpl_meta.toFixed(2).replace('.', ',')}`;
        document.getElementById('leads-anuncios').textContent = data.leads_anuncios.toLocaleString('pt-BR');
        document.getElementById('leads-instagram').textContent = data.leads_instagram.toLocaleString('pt-BR');
        document.getElementById('investimento-total').textContent = data.investimento_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    let leadsChart = null;
    function updateChart(data) {
        const ctx = document.getElementById('leadsChart').getContext('2d');
        if (leadsChart) leadsChart.destroy();
        
        leadsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.data),
                datasets: [
                    { label: 'Nº de Leads (RD)', data: data.map(item => item.leads_rd), borderColor: 'rgba(99, 102, 241, 1)', backgroundColor: 'rgba(99, 102, 241, 0.2)', fill: true, yAxisID: 'yLeads', tension: 0.4 },
                    { label: 'Custo por Lead (RD)', data: data.map(item => item.cpl_rd), borderColor: 'rgba(234, 179, 8, 1)', backgroundColor: 'rgba(234, 179, 8, 0.2)', fill: true, yAxisID: 'yCPL', tension: 0.4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    yLeads: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Nº de Leads' } },
                    yCPL: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Custo por Lead (R$)' }, grid: { drawOnChartArea: false } }
                }
            }
        });
    }

    async function initialize() {
        try {
            const response = await fetch(DATA_FILE);
            if (!response.ok) throw new Error(`Não foi possível carregar o arquivo ${DATA_FILE}`);
            allData = await response.json();
            
            processDataForPeriod('1');

            document.querySelector('.filters').addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    document.querySelectorAll('.filters button').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    processDataForPeriod(e.target.dataset.period);
                }
            });
        } catch (error) {
            showError(`Falha crítica: ${error.message}`);
        }
    }
    
    const buttons = document.querySelectorAll('.filters button');
    buttons[0].dataset.period = '1';
    buttons[1].dataset.period = 'yesterday';
    buttons[2].dataset.period = '7';
    buttons[3].dataset.period = '14';
    buttons[4].dataset.period = '30';

    initialize();
});
