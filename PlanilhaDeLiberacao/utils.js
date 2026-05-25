// =======================================================================
// DECLARAÇÃO DE VARIÁVEIS GLOBAIS
// =======================================================================
var advogadoAdicionalCount = 0;
var herdeiroCount = 0;
var cessionarioCount = 0;
var advHerdeiroCount = 0;
var advCessionarioCount = 0;
var peritoAdicionalCount = 0;
var modalAdvogadosCount = 0;
var modalPeritosCount = 0;
var modalSucumbenciaisCount = 0;
var advSucumbencialCount = 0;
var sucumbenciaisConfirmado = false;
var lastAbaAdvHonNet = 0;
var lastAbaAdvIrrfTotal = 0;
var customConfirmCallback = null;

// =======================================================================
// FUNÇÕES DE UTILIDADE E FORMATAÇÃO
// =======================================================================
function openTab(evt, tabName) {
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => pane.style.display = 'none');

    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabName).style.display = 'block';
    evt.currentTarget.classList.add('active');
}

function switchToTab(tabId) {
    const tabPane = document.getElementById(tabId);
    if (tabPane && tabPane.style.display === 'none') {
        const btn = document.querySelector(`.tab-button[onclick*="${tabId}"]`);
        if (btn) btn.click();
    }
}

function getNumericValue(id) {
    const input = document.getElementById(id);
    if (!input) return 0;
    const valorString = (input.tagName === 'INPUT' || input.tagName === 'SPAN' || input.tagName === 'TD') ? (input.value || input.textContent) : '0';
    const valorNumericoString = valorString.replace(/\./g, '').replace(',', '.').replace('R$', '').replace('%', '').trim();
    return parseFloat(valorNumericoString) || 0;
}

function getNumericValueFromInput(input) {
    if (!input) return 0;
    return getNumericValue(input.id);
}

function padZeros(input, length) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 0) {
        input.value = valor.padStart(length, '0');
    }
}

function validarAnoProcesso(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length === 4) {
        const ano = parseInt(valor, 10);
        const anoAtual = new Date().getFullYear();
        if (ano < 1900 || ano > anoAtual + 5) {
            showCustomAlert(`O ano do processo (${ano}) é inválido. Por favor, insira um ano válido.`);
            input.value = '';
            input.classList.add('input-error');
        } else {
            input.classList.remove('input-error');
        }
    } else if (valor.length > 0 && valor.length < 4) {
        showCustomAlert('O ano do processo deve possuir 4 dígitos.');
        input.classList.add('input-error');
    }
}

function formatarTextoMaiusculo(input) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.toUpperCase();
    input.setSelectionRange(start, end);
}

function formatarObservacoes(input) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    let text = input.value.toLowerCase();
    text = text.replace(/(^\s*|[.!?]\s+)([a-z\u00E0-\u00FC])/g, function(m, p1, p2) {
        return p1 + p2.toUpperCase();
    });
    input.value = text;
    input.setSelectionRange(start, end);
    
    const obsPrint = document.getElementById('observacoes-print');
    if (obsPrint) obsPrint.innerText = text;
}

function formatarMoedaParaExibicao(valor) {
    const num = parseFloat(valor);
    if (isNaN(num)) return "0,00";
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarNumero(input, maxLength) {
    let valor = input.value.replace(/\D/g, '');
    input.value = valor.substring(0, maxLength);
}

function handleProcessoPaste(event) {
    let pasteData = (event.clipboardData || window.clipboardData).getData('text').trim();

    if (pasteData.match(/^[0-9]+-[0-9]+\.[0-9]+/)) {
        event.preventDefault();
        let partes = pasteData.split(/[-.]/);
        if (partes.length >= 3) {
            document.getElementById('proc-num').value = partes[0].replace(/\D/g, '').padStart(7, '0');
            document.getElementById('proc-digito').value = partes[1].replace(/\D/g, '').substring(0, 2).padStart(2, '0');
            document.getElementById('proc-ano').value = partes[2].replace(/\D/g, '').substring(0, 4);
            validarAnoProcesso(document.getElementById('proc-ano'));
            return;
        }
    }

    let numbers = pasteData.replace(/\D/g, '');
    if (numbers.length >= 13) {
        event.preventDefault();
        numbers = numbers.padStart(20, '0'); 
        document.getElementById('proc-num').value = numbers.substring(0, 7);
        document.getElementById('proc-digito').value = numbers.substring(7, 9);
        document.getElementById('proc-ano').value = numbers.substring(9, 13);
        validarAnoProcesso(document.getElementById('proc-ano'));
    }
}

function formatarDocumento(input, tipo) {
    let valor = input.value.replace(/\D/g, '');
    let formato = '';
    if (tipo === 'CPF' || (tipo === 'AMBOS' && valor.length <= 11)) {
        if (valor.length > 0) formato = valor.substring(0, 3);
        if (valor.length > 3) formato += '.' + valor.substring(3, 6);
        if (valor.length > 6) formato += '.' + valor.substring(6, 9);
        if (valor.length > 9) formato += '-' + valor.substring(9, 11);
    } else if (tipo === 'CNPJ' || (tipo === 'AMBOS' && valor.length > 11)) {
        if (valor.length > 0) formato = valor.substring(0, 2);
        if (valor.length > 2) formato += '.' + valor.substring(2, 5);
        if (valor.length > 5) formato += '.' + valor.substring(5, 8);
        if (valor.length > 8) formato += '/' + valor.substring(8, 12);
        if (valor.length > 12) formato += '-' + valor.substring(12, 14);
    } else {
        formato = valor;
    }
    input.value = formato;
}

function formatarMoeda(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length === 0) {
        input.value = '0,00';
        return;
    }
    valor = valor.padStart(3, '0');
    let parteInteira = valor.slice(0, -2);
    let parteDecimal = valor.slice(-2);
    parteInteira = parteInteira.replace(/^0+/, '') || '0';
    let resultado = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ',' + parteDecimal;
    input.value = resultado;
}

function formatarPercentual(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor === '') {
        input.value = '';
        return;
    }
    valor = (parseInt(valor, 10) || 0).toString();
    valor = valor.padStart(3, '0');
    let parteInteira = valor.slice(0, -2);
    let parteDecimal = valor.slice(-2);
    parteInteira = parteInteira.replace(/^0+/, '') || '0';

    if (parseFloat(parteInteira + '.' + parteDecimal) > 100) {
        parteInteira = '100';
        parteDecimal = '00';
    }
    input.value = parteInteira + ',' + parteDecimal + '%';

    if (input.id.startsWith('adv-percentual')) {
        calcularHonorarios('adv');
        verificarTravasHonorarios();
        atualizarSomaLiquido();
    } else if (input.id.includes('adv-ad-percentual')) {
        validarRateioHonorarios(input);
        atualizarCredoresAdicionais();
    } else if (input.id.startsWith('her-percentual')) {
        validarRateioHerdeiros(input);
        atualizarCredoresAdicionais();
    } else if (input.id.startsWith('ces-percentual')) {
        validarRateioCessionarios(input);
        atualizarCredoresAdicionais();
    } else if (input.id === 'adv-principal-percentual') {
        validarRateioHonorarios(input);
        atualizarCredoresAdicionais();
    } else if (input.id.startsWith('her-adv-part-')) {
        validarRateioAdvHerdeiro(input);
        atualizarCredoresAdicionais();
    } else if (input.id.startsWith('ces-adv-part-')) {
        validarRateioAdvCessionario(input);
        atualizarCredoresAdicionais();
    } else if (input.id.startsWith('her-adv-perc-global-') || input.id.startsWith('ces-adv-perc-global-')) {
        atualizarCredoresAdicionais();
    }
}

function extrairValorSeguro(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    const val = el.value !== undefined ? el.value : (el.textContent || '');
    return val.toString().trim();
}

function preencherDataAtual() {
    const dataEl = document.getElementById('data-liberacao-header');
    if (dataEl) dataEl.value = new Date().toLocaleDateString('pt-BR');
}

function getFieldName(input) {
    const id = input.id;
    if (id.startsWith('her-nome-')) return `Nome do Herdeiro ${id.split('-')[2]}`;
    if (id.startsWith('her-cpf-')) return `CPF do Herdeiro ${id.split('-')[2]}`;
    if (id.startsWith('her-resultado-')) return `Valor/Resultado do Herdeiro ${id.split('-')[2]}`;
    if (id.startsWith('her-percentual-')) return `Percentual do Herdeiro ${id.split('-')[2]}`;

    if (id.startsWith('perito-ad-nome-')) return `Nome do Perito (a) ${parseInt(id.split('-')[3]) + 1}`;
    if (id.startsWith('perito-ad-cpf-')) return `CPF/CNPJ do Perito (a) ${parseInt(id.split('-')[3]) + 1}`;
    if (id.startsWith('perito-ad-liquido-')) return `Líquido a Liberar do Perito (a) ${parseInt(id.split('-')[3]) + 1}`;

    if (id.startsWith('ces-nome-')) return `Nome do Cessionário ${id.split('-')[2]}`;
    if (id.startsWith('ces-cpf-')) return `CPF/CNPJ do Cessionário ${id.split('-')[2]}`;
    if (id.startsWith('ces-resultado-')) return `Valor/Resultado do Cessionário ${id.split('-')[2]}`;
    if (id.startsWith('ces-percentual-')) return `Percentual do Cessionário ${id.split('-')[2]}`;

    if (id.startsWith('adv-ad-nome-')) return `Nome do Advogado (a) ${parseInt(id.split('-')[3]) + 1}`;
    if (id.startsWith('adv-ad-cpf-')) return `CPF/CNPJ do Advogado (a) ${parseInt(id.split('-')[3]) + 1}`;
    if (id.startsWith('adv-ad-percentual-')) return `Percentual do Advogado (a) ${parseInt(id.split('-')[3]) + 1}`;

    if (id.startsWith('her-adv-nome-')) return `Nome do Advogado do Herdeiro ${id.split('-')[3]}`;
    if (id.startsWith('her-adv-cpf-')) return `CPF/CNPJ do Advogado do Herdeiro ${id.split('-')[3]}`;
    if (id.startsWith('her-adv-part-')) return `Participação do Advogado do Herdeiro ${id.split('-')[3]}`;
    if (id.startsWith('her-adv-perc-global-')) return `Percentual Global de Honorários do Herdeiro ${id.split('-')[4]}`;
    if (id.startsWith('her-adv-fix-global-')) return `Valor Fixado Global de Honorários do Herdeiro ${id.split('-')[4]}`;

    if (id.startsWith('ces-adv-nome-')) return `Nome do Advogado do Cessionário ${id.split('-')[3]}`;
    if (id.startsWith('ces-adv-cpf-')) return `CPF/CNPJ do Advogado do Cessionário ${id.split('-')[3]}`;
    if (id.startsWith('ces-adv-part-')) return `Participação do Advogado do Cessionário ${id.split('-')[3]}`;
    if (id.startsWith('ces-adv-perc-global-')) return `Percentual Global de Honorários do Cessionário ${id.split('-')[4]}`;
    if (id.startsWith('ces-adv-fix-global-')) return `Valor Fixado Global de Honorários do Cessionário ${id.split('-')[4]}`;

    return null;
}

function showCustomConfirm(message, callback) {
    const modal = document.getElementById('custom-confirm-modal');
    const msgEl = document.getElementById('custom-confirm-message');
    if (modal && msgEl) {
        msgEl.innerHTML = message;
        customConfirmCallback = callback;
        modal.style.display = 'block';
    } else {
        const result = confirm(message.replace(/<[^>]*>?/gm, ''));
        if (callback) callback(result);
    }
}

function closeCustomConfirm(result) {
    const modal = document.getElementById('custom-confirm-modal');
    if (modal) modal.style.display = 'none';
    if (customConfirmCallback) {
        customConfirmCallback(result);
        customConfirmCallback = null;
    }
}

function showCustomAlert(message) {
    const modal = document.getElementById('custom-alert-modal');
    const msgEl = document.getElementById('custom-alert-message');
    if (modal && msgEl) {
        msgEl.innerHTML = message;
        modal.style.display = 'block';
    } else {
        alert(message.replace(/<br>/g, '\n').replace(/<[^>]*>?/gm, ''));
    }
}

function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) modal.style.display = 'none';
}