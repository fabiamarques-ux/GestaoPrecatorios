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
var customPromptCallback = null;
var currentLoadedKey = null;
var loadedProcNumBase = null;
var processoDuplicadoConfirmado = false;
var motivoProcessoDuplicado = '';
var confirmedProcNumBase = null;

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
            verificarProcessoDuplicado();
        }
    } else if (valor.length > 0 && valor.length < 4) {
        showCustomAlert('O ano do processo deve possuir 4 dígitos.');
        input.classList.add('input-error');
    }
}

function showCustomPrompt(message, maxLength, callback) {
    const modal = document.getElementById('custom-prompt-modal');
    const msgEl = document.getElementById('custom-prompt-message');
    const inputEl = document.getElementById('custom-prompt-input');
    if (modal && msgEl && inputEl) {
        msgEl.innerHTML = message;
        inputEl.value = '';
        if (maxLength) inputEl.maxLength = maxLength;
        customPromptCallback = callback;
        modal.style.display = 'block';
        setTimeout(() => inputEl.focus(), 100);
    } else {
        const result = prompt(message.replace(/<[^>]*>?/gm, ''));
        if (callback) callback(result ? result.substring(0, maxLength || 30) : null);
    }
}

function closeCustomPrompt(result) {
    const modal = document.getElementById('custom-prompt-modal');
    if (modal) modal.style.display = 'none';
    if (customPromptCallback) {
        customPromptCallback(result);
        customPromptCallback = null;
    }
}

function verificarProcessoDuplicado() {
    const procNum = document.getElementById('proc-num')?.value || '';
    const procDigito = document.getElementById('proc-digito')?.value || '';
    const procAno = document.getElementById('proc-ano')?.value || '';
    
    if (procNum.length === 7 && procDigito.length === 2 && procAno.length === 4) {
        const baseProcesso = `${procNum}-${procDigito}.${procAno}.5.19.0000`;
        
        if (window.loadedProcNumBase === baseProcesso) return;
        if (window.processoDuplicadoConfirmado && window.confirmedProcNumBase === baseProcesso) return;

        let db = JSON.parse(localStorage.getItem('planilha_db_rascunhos') || '{}');
        let existe = false;
        
        for (let chave in db) {
            if (chave.startsWith(baseProcesso)) {
                existe = true;
                break;
            }
        }
        
        if (existe) {
            showCustomConfirm(`Já existe uma ou mais planilhas salvas com o número de processo <strong>${baseProcesso}</strong>.<br><br>Deseja continuar a criação de uma nova planilha para este mesmo processo em vez de utilizar a existente no banco?`, function(confirmado) {
                if (confirmado) {
                    setTimeout(() => {
                        showCustomPrompt("Por favor, informe o MOTIVO de constar mais de uma planilha no banco de dados para o mesmo número de processo (Ex. Parcela n.º ____ do Acordo n.º _____):", 60, function(motivo) {
                            if (motivo && motivo.trim() !== "") {
                                window.processoDuplicadoConfirmado = true;
                                window.motivoProcessoDuplicado = motivo.trim();
                                window.confirmedProcNumBase = baseProcesso;
                            } else {
                                showCustomAlert("O preenchimento do motivo é obrigatório para continuar criando uma planilha duplicada.<br><br>O número do processo será limpo.");
                                document.getElementById('proc-num').value = '';
                                document.getElementById('proc-digito').value = '';
                                document.getElementById('proc-ano').value = '';
                            }
                        });
                    }, 100);
                } else {
                    document.getElementById('proc-num').value = '';
                    document.getElementById('proc-digito').value = '';
                    document.getElementById('proc-ano').value = '';
                }
            });
        }
    }
}

function formatarTextoMaiusculo(input) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.toUpperCase();
    input.setSelectionRange(start, end);
}

function formatarObservacoes(input) {
    const obsPrint = document.getElementById('observacoes-print');
    if (obsPrint) obsPrint.innerText = input.value;
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

function alertarPreenchimentoBeneficiario(inputElement, tipo) {
    setTimeout(() => {
        const valor = getNumericValueFromInput(inputElement);
        if (valor > 0) {
            if (document.getElementById('modal-advogados')?.style.display === 'block' ||
                document.getElementById('modal-peritos')?.style.display === 'block' ||
                document.getElementById('modal-previdencia')?.style.display === 'block') {
                return;
            }

            if (tipo === 'previdencia') {
                const nome = document.getElementById('nome-fundo-previdencia')?.value || '';
                if (nome.trim() === '') {
                    showCustomAlert("Você informou um valor de <strong>Previdência Privada</strong>.<br><br>Lembre-se de clicar no ícone de edição (<i class='fas fa-edit'></i>) para informar o Nome e o CNPJ do Fundo.");
                }
            } else if (tipo === 'advogado') {
                const nomePrincipal = document.getElementById('adv-nome-principal')?.value || '';
                let temNome = nomePrincipal.trim() !== '';
                for (let i = 1; i <= (window.advogadoAdicionalCount || 0); i++) {
                    const n = document.getElementById(`adv-ad-nome-${i}`)?.value || '';
                    if (n.trim() !== '') { temNome = true; break; }
                }
                for (let i = 1; i <= (window.advSucumbencialCount || 0); i++) {
                    const n = document.getElementById(`adv-suc-nome-${i}`)?.value || '';
                    if (n.trim() !== '') { temNome = true; break; }
                }
                if (!temNome) {
                    showCustomAlert("Você informou um valor de <strong>Honorários Advocatícios</strong>.<br><br>Lembre-se de clicar no ícone de edição (<i class='fas fa-edit'></i>) para informar os dados do beneficiário.");
                }
            } else if (tipo === 'perito') {
                const nomePrincipal = document.getElementById('perito-nome-principal')?.value || '';
                let temNome = nomePrincipal.trim() !== '';
                for (let i = 1; i <= (window.peritoAdicionalCount || 0); i++) {
                    const n = document.getElementById(`perito-ad-nome-${i}`)?.value || '';
                    if (n.trim() !== '') { temNome = true; break; }
                }
                if (!temNome) {
                    showCustomAlert("Você informou um valor de <strong>Honorários Periciais</strong>.<br><br>Lembre-se de clicar no ícone de edição (<i class='fas fa-edit'></i>) para informar os dados do beneficiário.");
                }
            }
        }
    }, 250);
}

// =======================================================================
// ARMAZENAMENTO LOCAL (LOCALSTORAGE)
// =======================================================================
function obterChaveRascunho() {
    const procNum = document.getElementById('proc-num')?.value || '';
    const procDigito = document.getElementById('proc-digito')?.value || '';
    const procAno = document.getElementById('proc-ano')?.value || '';
    const reclamante = document.getElementById('reclamante')?.value || '';
    let chave = '';
    if (procNum) {
        chave = `${procNum}-${procDigito}.${procAno}.5.19.0000`;
        if (reclamante) chave += ` - ${reclamante}`;
        
        if (window.processoDuplicadoConfirmado && window.motivoProcessoDuplicado) {
            chave += ` (${window.motivoProcessoDuplicado})`;
        }
    } else if (reclamante) {
        chave = `Sem Processo - ${reclamante}`;
    } else {
        chave = 'Rascunho Temporário';
    }
    return chave;
}

function abrirOpcoesSalvamento() {
    const modal = document.getElementById('modal-opcoes-salvamento');
    if (modal) modal.style.display = 'block';
}

function fecharOpcoesSalvamento() {
    const modal = document.getElementById('modal-opcoes-salvamento');
    if (modal) modal.style.display = 'none';
}

function executarSalvamento(tipo) {
    fecharOpcoesSalvamento();
    if (tipo === 'final') {
        if (!validarFormulario()) return;
        salvarRascunho(true);
    } else {
        salvarRascunho(false);
    }
}

function salvarRascunho(isFinal = false) {
    const data = {
        inputs: {},
        counters: {
            advogadoAdicionalCount: window.advogadoAdicionalCount,
            herdeiroCount: window.herdeiroCount,
            cessionarioCount: window.cessionarioCount,
            advHerdeiroCount: window.advHerdeiroCount,
            advCessionarioCount: window.advCessionarioCount,
            peritoAdicionalCount: window.peritoAdicionalCount,
            modalAdvogadosCount: window.modalAdvogadosCount,
            modalPeritosCount: window.modalPeritosCount,
            modalSucumbenciaisCount: window.modalSucumbenciaisCount,
            advSucumbencialCount: window.advSucumbencialCount,
            sucumbenciaisConfirmado: window.sucumbenciaisConfirmado,
            lastAbaAdvHonNet: window.lastAbaAdvHonNet,
            lastAbaAdvIrrfTotal: window.lastAbaAdvIrrfTotal,
            processoDuplicadoConfirmado: window.processoDuplicadoConfirmado,
            motivoProcessoDuplicado: window.motivoProcessoDuplicado,
            confirmedProcNumBase: window.confirmedProcNumBase
        },
        html: {
            advAdicionais: document.getElementById('adv-adicionais-list')?.innerHTML,
            peritosAdicionais: document.getElementById('peritos-adicionais-list')?.innerHTML,
            herdeiros: document.getElementById('herdeiros-list')?.innerHTML,
            cessionarios: document.getElementById('cessionarios-list')?.innerHTML,
            advSucumbenciais: document.getElementById('adv-sucumbenciais-list')?.innerHTML,
            listaAdvModal: document.getElementById('lista-advogados-modal')?.innerHTML,
            listaPerModal: document.getElementById('lista-peritos-modal')?.innerHTML,
            listaSucModal: document.getElementById('lista-sucumbenciais-modal')?.innerHTML
        },
        blocksDisplay: {
            advPrincipal: document.getElementById('adv-principal-block')?.style.display,
            peritoPrincipal: document.getElementById('perito-principal-block')?.style.display,
            modalSucumbenciais: document.getElementById('modal-sucumbenciais-section')?.style.display,
            containerFgtsAdv: document.getElementById('container-fgts-base-adv')?.style.display,
            containerFgtsHer: document.getElementById('container-fgts-base-her')?.style.display,
            containerFgtsCes: document.getElementById('container-fgts-base-ces')?.style.display,
            advFixadoFields: document.getElementById('adv-fixado-fields')?.style.display,
            advPercentualFields: document.getElementById('adv-percentual-fields')?.style.display
        }
    };

    document.querySelectorAll('input, select, textarea').forEach(el => {
        let key = el.id;
        if (!key && el.name) {
            key = el.name + '_' + (el.value || 'novalue');
        }
        if (key) {
            if (el.type === 'checkbox' || el.type === 'radio') {
                data.inputs[key] = el.checked;
            } else {
                data.inputs[key] = el.value;
            }
            data.inputs[key + '_readOnly'] = el.readOnly;
            if (el.dataset) data.inputs[key + '_dataset'] = Object.assign({}, el.dataset);
        }
    });

    document.querySelectorAll('span').forEach(el => {
        if (el.id) {
            data.inputs[el.id + '_span'] = el.textContent;
        }
    });

    let chave = window.currentLoadedKey;
    if (!chave) {
        chave = obterChaveRascunho();
        window.currentLoadedKey = chave;
    }
    let db = JSON.parse(localStorage.getItem('planilha_db_rascunhos') || '{}');

    // Migração de segurança do rascunho modelo antigo para o novo banco
    const oldRascunho = localStorage.getItem('rascunhoPlanilha');
    if (oldRascunho) {
        db['Rascunho Anterior (Legado)'] = {
            timestamp: Date.now() - 1000,
            payload: JSON.parse(oldRascunho),
            isAutoSave: false
        };
        localStorage.removeItem('rascunhoPlanilha');
    }

    // Geração de histórico de alterações dentro da mesma planilha:
    let existingHistory = [];
    if (db[chave]) {
        existingHistory = db[chave].history || [];
        // Apenas envia a versão anterior para o histórico se ela for uma Planilha Final
        if (db[chave].isFinal) {
            existingHistory.push({
                timestamp: db[chave].timestamp,
                payload: db[chave].payload,
                isFinal: db[chave].isFinal
            });
        }
    }

    db[chave] = {
        timestamp: Date.now(),
        payload: data,
        isAutoSave: false,
        isFinal: isFinal,
        history: existingHistory
    };

    localStorage.setItem('planilha_db_rascunhos', JSON.stringify(db));
    
    if (isFinal) {
        showCustomConfirm("Planilha Final salva com sucesso no banco de dados local!<br><br>Deseja gerar o <strong>RELATÓRIO DE IMPRESSÃO agora?</strong>", function(confirmacao) {
            if (confirmacao) {
                gerarRelatorio(true);
            }
        });
    } else {
        showCustomAlert("Rascunho atualizado com sucesso no banco de dados local!");
    }
}

function carregarRascunho() {
    abrirModalBancoRascunhos();
}

function abrirModalBancoRascunhos() {
    const inputPesquisa = document.getElementById('pesquisa-rascunhos');
    if (inputPesquisa) inputPesquisa.value = '';
    
    renderizarListaRascunhos();
    const modal = document.getElementById('modal-banco-rascunhos');
    if (modal) modal.style.display = 'block';
}

function fecharModalBancoRascunhos() {
    const modal = document.getElementById('modal-banco-rascunhos');
    if (modal) modal.style.display = 'none';
}

function filtrarRascunhos() {
    const input = document.getElementById('pesquisa-rascunhos');
    if (!input) return;
    
    const termo = input.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tbody = document.getElementById('lista-rascunhos-tbody');
    if (!tbody) return;
    
    const linhas = tbody.getElementsByTagName('tr');
    for (let i = 0; i < linhas.length; i++) {
        if (linhas[i].cells.length <= 1) continue; 
        
        const chaveDaLinha = linhas[i].cells[1].textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        linhas[i].style.display = chaveDaLinha.includes(termo) ? '' : 'none';
    }
}

function renderizarListaRascunhos() {
    const db = JSON.parse(localStorage.getItem('planilha_db_rascunhos') || '{}');
    
    const tbody = document.getElementById('lista-rascunhos-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const chaves = Object.keys(db).sort((a, b) => db[b].timestamp - db[a].timestamp);

    if (chaves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhum processo salvo no banco de dados.</td></tr>';
        return;
    }

    chaves.forEach(chave => {
        const rascunho = db[chave];
        const dataFormatada = new Date(rascunho.timestamp).toLocaleString('pt-BR');
        const chaveEscapada = chave.replace(/'/g, "\\'");
        
        let displayNome = chave;
        if (rascunho.payload && rascunho.payload.inputs) {
            const pNum = rascunho.payload.inputs['proc-num'] || '';
            const pDig = rascunho.payload.inputs['proc-digito'] || '';
            const pAno = rascunho.payload.inputs['proc-ano'] || '';
            const rec = rascunho.payload.inputs['reclamante'] || '';
            
            if (pNum) {
                let baseName = `${pNum}-${pDig}.${pAno}.5.19.0000`;
                if (rec) baseName += ` - ${rec}`;
                
                if (rascunho.payload && rascunho.payload.counters && rascunho.payload.counters.motivoProcessoDuplicado) {
                    baseName += ` (${rascunho.payload.counters.motivoProcessoDuplicado})`;
                } else if (chave.includes('(Adicional - ')) {
                    const match = chave.match(/\(Adicional - (.*?)\)/);
                    if (match) baseName += ` (${match[1]})`;
                }
                
                displayNome = baseName;
            }
        }
        
        // Remove completamente qualquer variação da palavra "CÓPIA" ou "VERSÃO" da exibição na listagem
        displayNome = displayNome.replace(/\s*[-(]?\s*(?:c[oó]pia|vers[aã]o)[\s\d]*\)?/gi, '').trim();
        
        let statusBadge = '';
        if (rascunho.isHistory) {
            statusBadge = '<span style="background-color: #6c757d; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">Histórico (Legado)</span>';
        } else if (rascunho.isFinal) {
            statusBadge = '<span style="background-color: var(--primary-color); color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">Final</span>';
        } else {
            statusBadge = '<span style="background-color: #ffc107; color: #856404; padding: 4px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">Rascunho</span>';
        }
        
        const historyValido = (rascunho.history || []).filter(h => h.isFinal);
        const hasHistoryArray = historyValido.length > 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;"><input type="checkbox" class="chk-export-row" value="${chaveEscapada}"></td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500;">${displayNome}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${statusBadge}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${dataFormatada}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; white-space: nowrap;">
                ${hasHistoryArray ? `<button type="button" class="btn-table-action action-history" style="padding: 6px 10px; font-size: 0.85em; margin-right: 5px;" onclick="toggleHistorico('${chaveEscapada}')" title="Ver Histórico de Alterações"><i class="fas fa-history"></i></button>` : ''}
                <button type="button" class="btn-table-action action-primary" style="padding: 6px 10px; font-size: 0.85em; margin-right: 5px;" onclick="executarCarregarRascunho('${chaveEscapada}', null, false)" title="Visualizar planilha bloqueada para edição"><i class="fas fa-eye"></i></button>
                <button type="button" class="btn-table-action action-primary" style="padding: 6px 10px; font-size: 0.85em; margin-right: 5px;" onclick="duplicarRascunho('${chaveEscapada}')" title="Duplicar esta planilha"><i class="fas fa-copy"></i></button>
                <button type="button" class="btn-table-action action-primary" style="padding: 6px 10px; font-size: 0.85em; margin-right: 5px;" onclick="executarCarregarRascunho('${chaveEscapada}', null, true)" title="Carregar planilha para alteração"><i class="fas fa-edit"></i></button>
            </td>
        `;
        tbody.appendChild(tr);

        if (hasHistoryArray) {
            const historySorted = [...historyValido].map(h => ({...h, originalIndex: rascunho.history.indexOf(h)})).sort((a, b) => b.timestamp - a.timestamp);
            
            historySorted.forEach((hist, displayIndex) => {
                const histDataFormatada = new Date(hist.timestamp).toLocaleString('pt-BR');
                const histTr = document.createElement('tr');
                histTr.className = `historico-row-${chaveEscapada.replace(/[^a-zA-Z0-9]/g, '_')}`;
                histTr.style.display = 'none'; 
                histTr.style.backgroundColor = '#f8f9fa';
                
                histTr.innerHTML = `
                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee;"></td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee; padding-left: 40px; color: #555;"><i class="fas fa-level-up-alt fa-rotate-90" style="margin-right: 8px; color: #ccc;"></i>Versão Anterior ${historySorted.length - displayIndex}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;"></td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #555;">${histDataFormatada}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center; white-space: nowrap;">
                        <button type="button" class="btn-table-action action-primary" style="padding: 4px 8px; font-size: 0.8em; margin-right: 5px;" onclick="executarCarregarRascunho('${chaveEscapada}', ${hist.originalIndex}, false)" title="Visualizar esta versão antiga"><i class="fas fa-eye"></i></button>
                    </td>
                `;
                tbody.appendChild(histTr);
            });
        }
    });
}

function duplicarRascunho(chave) {
    let db = JSON.parse(localStorage.getItem('planilha_db_rascunhos') || '{}');
    const rascunhoOriginal = db[chave];
    if (!rascunhoOriginal) return;

    const novoPayload = JSON.parse(JSON.stringify(rascunhoOriginal.payload));
    
    if (novoPayload.inputs) {
        novoPayload.inputs['proc-num'] = '';
        novoPayload.inputs['proc-digito'] = '';
        novoPayload.inputs['proc-ano'] = '';
        
        // Limpar Reclamante e CPF
        novoPayload.inputs['reclamante'] = '';
        novoPayload.inputs['cpf'] = '';

        // Limpar Dados do Depósito
        novoPayload.inputs['id-deposito'] = '';
        novoPayload.inputs['conta-judicial'] = '';
        novoPayload.inputs['valor-deposito'] = '';

        // Limpar Retenções
        novoPayload.inputs['pensao-beneficiario'] = '';
        novoPayload.inputs['pensao-cpf'] = '';
        novoPayload.inputs['pensao-alimenticia'] = '';
        novoPayload.inputs['outras-motivo'] = '';
        novoPayload.inputs['outras-retencoes'] = '';

        // Limpar Observações
        novoPayload.inputs['observacoes-gerais'] = '';
        if (novoPayload.inputs['observacoes-print_span'] !== undefined) {
            novoPayload.inputs['observacoes-print_span'] = '';
        }

        // Limpar chaves de Herdeiros e Cessionários
        for (let key in novoPayload.inputs) {
            if (key.startsWith('her-') || key.startsWith('ces-') || key.includes('incluir-fgts-base-her') || key.includes('incluir-fgts-base-ces')) {
                delete novoPayload.inputs[key];
            }
        }
    }

    if (novoPayload.counters) {
        novoPayload.counters.herdeiroCount = 0;
        novoPayload.counters.cessionarioCount = 0;
        novoPayload.counters.advHerdeiroCount = 0;
        novoPayload.counters.advCessionarioCount = 0;
        novoPayload.counters.processoDuplicadoConfirmado = false;
        novoPayload.counters.motivoProcessoDuplicado = '';
        novoPayload.counters.confirmedProcNumBase = null;
    }

    if (novoPayload.html) {
        novoPayload.html.herdeiros = '';
        novoPayload.html.cessionarios = '';
    }

    if (novoPayload.blocksDisplay) {
        novoPayload.blocksDisplay.containerFgtsHer = 'none';
        novoPayload.blocksDisplay.containerFgtsCes = 'none';
    }

    let baseChave = chave;
    const match = chave.match(/^(.*?) \((?:CÓPIA|COPIA|Versão)(?: \d+)?\)$/i);
    if (match) {
        baseChave = match[1];
    }

    let count = 1;
    let novaChave = baseChave + ` (Versão ${count})`;
    while (db[novaChave]) {
        count++;
        novaChave = baseChave + ` (Versão ${count})`;
    }

    db[novaChave] = {
        timestamp: Date.now(),
        payload: novoPayload,
        isAutoSave: false,
        isFinal: false,
        history: []
    };

    localStorage.setItem('planilha_db_rascunhos', JSON.stringify(db));
    renderizarListaRascunhos();
    showCustomAlert("Planilha duplicada com sucesso! A cópia foi salva como <strong>Rascunho</strong>.");
}

function excluirRascunhosSelecionados() {
    const chkBoxes = document.querySelectorAll('.chk-export-row:checked');
    if (chkBoxes.length === 0) {
        showCustomAlert("Por favor, marque a caixa de seleção de pelo menos uma planilha para excluir.");
        return;
    }

    showCustomConfirm(`Deseja realmente excluir <strong>${chkBoxes.length} planilha(s)</strong> do banco de dados?<br><br>Esta ação não poderá ser desfeita.`, function(confirmacao) {
        if (confirmacao) {
            let db = JSON.parse(localStorage.getItem('planilha_db_rascunhos') || '{}');
            chkBoxes.forEach(chk => {
                delete db[chk.value];
            });
            localStorage.setItem('planilha_db_rascunhos', JSON.stringify(db));
            renderizarListaRascunhos();
            const chkAll = document.getElementById('chk-select-all-export');
            if (chkAll) chkAll.checked = false;
            showCustomAlert("Planilha(s) excluída(s) com sucesso.");
        }
    });
}

function loadRascunhoToUI(rascunho) {
    const data = rascunho.payload;
    try {
        if (data.html) {
            if (document.getElementById('adv-adicionais-list')) document.getElementById('adv-adicionais-list').innerHTML = data.html.advAdicionais || '';
            if (document.getElementById('peritos-adicionais-list')) document.getElementById('peritos-adicionais-list').innerHTML = data.html.peritosAdicionais || '';
            if (document.getElementById('herdeiros-list')) document.getElementById('herdeiros-list').innerHTML = data.html.herdeiros || '';
            if (document.getElementById('cessionarios-list')) document.getElementById('cessionarios-list').innerHTML = data.html.cessionarios || '';
            if (document.getElementById('adv-sucumbenciais-list')) document.getElementById('adv-sucumbenciais-list').innerHTML = data.html.advSucumbenciais || '';
            
            if (document.getElementById('lista-advogados-modal')) document.getElementById('lista-advogados-modal').innerHTML = data.html.listaAdvModal || '';
            if (document.getElementById('lista-peritos-modal')) document.getElementById('lista-peritos-modal').innerHTML = data.html.listaPerModal || '';
            if (document.getElementById('lista-sucumbenciais-modal')) document.getElementById('lista-sucumbenciais-modal').innerHTML = data.html.listaSucModal || '';
        }

        if (data.counters) {
            window.advogadoAdicionalCount = data.counters.advogadoAdicionalCount || 0;
            window.herdeiroCount = data.counters.herdeiroCount || 0;
            window.cessionarioCount = data.counters.cessionarioCount || 0;
            window.advHerdeiroCount = data.counters.advHerdeiroCount || 0;
            window.advCessionarioCount = data.counters.advCessionarioCount || 0;
            window.peritoAdicionalCount = data.counters.peritoAdicionalCount || 0;
            window.modalAdvogadosCount = data.counters.modalAdvogadosCount || 0;
            window.modalPeritosCount = data.counters.modalPeritosCount || 0;
            window.modalSucumbenciaisCount = data.counters.modalSucumbenciaisCount || 0;
            window.advSucumbencialCount = data.counters.advSucumbencialCount || 0;
            window.sucumbenciaisConfirmado = data.counters.sucumbenciaisConfirmado || false;
            window.lastAbaAdvHonNet = data.counters.lastAbaAdvHonNet || 0;
            window.lastAbaAdvIrrfTotal = data.counters.lastAbaAdvIrrfTotal || 0;
            
            window.processoDuplicadoConfirmado = data.counters.processoDuplicadoConfirmado || false;
            window.motivoProcessoDuplicado = data.counters.motivoProcessoDuplicado || '';
            window.confirmedProcNumBase = data.counters.confirmedProcNumBase || null;
        } else {
            window.processoDuplicadoConfirmado = false;
            window.motivoProcessoDuplicado = '';
            window.confirmedProcNumBase = null;
        }

        if (data.inputs) {
            document.querySelectorAll('input, select, textarea').forEach(el => {
                let key = el.id;
                if (!key && el.name) {
                    key = el.name + '_' + (el.value || 'novalue');
                }
                if (key && data.inputs[key] !== undefined) {
                    if (el.type === 'checkbox' || el.type === 'radio') {
                        el.checked = data.inputs[key];
                    } else {
                        el.value = data.inputs[key];
                    }
                }
                if (key && data.inputs[key + '_readOnly'] !== undefined) {
                    el.readOnly = data.inputs[key + '_readOnly'];
                    if (el.readOnly) {
                        el.style.backgroundColor = '#e9ecef';
                        el.onclick = () => showCustomAlert("Qualquer alteração deve ser feita diretamente no lançamentos de honorários nas informações oriundas da planilha de atualização de cálculos.");
                    } else if (el.style.backgroundColor === 'rgb(233, 236, 239)' || el.style.backgroundColor === '#e9ecef') {
                        el.style.backgroundColor = 'white';
                        el.onclick = null;
                    }
                }
                if (key && data.inputs[key + '_dataset']) {
                    Object.assign(el.dataset, data.inputs[key + '_dataset']);
                }
            });
            
            const pN = data.inputs['proc-num'] || '';
            const pD = data.inputs['proc-digito'] || '';
            const pA = data.inputs['proc-ano'] || '';
            if (pN && pD && pA) {
                window.loadedProcNumBase = `${pN}-${pD}.${pA}.5.19.0000`;
            } else {
                window.loadedProcNumBase = null;
            }

            document.querySelectorAll('span').forEach(el => {
                if (el.id && data.inputs[el.id + '_span'] !== undefined) {
                    el.textContent = data.inputs[el.id + '_span'];
                }
            });
        }

        if (data.blocksDisplay) {
            const advPrinc = document.getElementById('adv-principal-block');
            if (advPrinc && data.blocksDisplay.advPrincipal) advPrinc.style.display = data.blocksDisplay.advPrincipal;
            
            const perPrinc = document.getElementById('perito-principal-block');
            if (perPrinc && data.blocksDisplay.peritoPrincipal) perPrinc.style.display = data.blocksDisplay.peritoPrincipal;
            
            const modSuc = document.getElementById('modal-sucumbenciais-section');
            if (modSuc && data.blocksDisplay.modalSucumbenciais) modSuc.style.display = data.blocksDisplay.modalSucumbenciais;

            const cFgtsAdv = document.getElementById('container-fgts-base-adv');
            if (cFgtsAdv && data.blocksDisplay.containerFgtsAdv) cFgtsAdv.style.display = data.blocksDisplay.containerFgtsAdv;

            const cFgtsHer = document.getElementById('container-fgts-base-her');
            if (cFgtsHer && data.blocksDisplay.containerFgtsHer) cFgtsHer.style.display = data.blocksDisplay.containerFgtsHer;

            const cFgtsCes = document.getElementById('container-fgts-base-ces');
            if (cFgtsCes && data.blocksDisplay.containerFgtsCes) cFgtsCes.style.display = data.blocksDisplay.containerFgtsCes;

            const advFixFields = document.getElementById('adv-fixado-fields');
            if (advFixFields && data.blocksDisplay.advFixadoFields) advFixFields.style.display = data.blocksDisplay.advFixadoFields;

            const advPercFields = document.getElementById('adv-percentual-fields');
            if (advPercFields && data.blocksDisplay.advPercentualFields) advPercFields.style.display = data.blocksDisplay.advPercentualFields;
        }

        atualizarTotalDevidoReclamada();
        atualizarSomaLiquido();
        atualizarCredoresAdicionais();
        verificarTravasHonorarios();
        
    } catch (e) {
        console.error("Erro em loadRascunhoToUI", e);
    }
}

function executarCarregarRascunho(chave, historyIndex = null, podeAlterar = true, gerarRelatorioAposLoad = false) {
    let db = JSON.parse(localStorage.getItem('planilha_db_rascunhos') || '{}');
    const rascunhoPai = db[chave];
    if (!rascunhoPai) {
        showCustomAlert("Processo não encontrado no banco.");
        return;
    }

    let rascunho = rascunhoPai;
    let isHistoryMode = false;
    
    if (historyIndex !== null && rascunhoPai.history && rascunhoPai.history[historyIndex]) {
        rascunho = rascunhoPai.history[historyIndex];
        isHistoryMode = true;
    }

    fecharModalBancoRascunhos();

    try {
        loadRascunhoToUI(rascunho);
        
        window.currentLoadedKey = chave;
        
        setModoVisualizacao(!podeAlterar);
        
        if (gerarRelatorioAposLoad) {
            gerarRelatorio(true);
        } else {
            if (isHistoryMode) {
                showCustomAlert("Versão de Histórico carregada em modo de <strong>visualização</strong>.");
            } else if (podeAlterar) {
                if (rascunho.isFinal) {
                    showCustomAlert("Planilha Final carregada para <strong>alteração</strong>.");
                } else {
                    showCustomAlert("Rascunho carregado para <strong>alteração</strong>.");
                }
            } else {
                showCustomAlert("Planilha carregada em modo de <strong>visualização</strong>.");
            }
        }

    } catch (e) {
        console.error(e);
        showCustomAlert("Erro ao carregar os dados. O arquivo pode estar corrompido.");
    }
}

function exportarBackup() {
    const db = JSON.parse(localStorage.getItem('planilha_db_rascunhos') || '{}');
    const chkBoxes = document.querySelectorAll('.chk-export-row:checked');
    
    if (Object.keys(db).length === 0) {
        showCustomAlert("Não há processos salvos para exportar.");
        return;
    }
    
    if (chkBoxes.length === 0) {
        showCustomAlert("Por favor, marque a caixa de seleção de pelo menos uma planilha para exportar.");
        return;
    }
    
    const exportData = {};
    chkBoxes.forEach(chk => {
        const chave = chk.value;
        if (db[chave]) {
            exportData[chave] = db[chave];
        }
    });
    
    const blob = new Blob([JSON.stringify(exportData)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dataAtual = new Date().toISOString().split('T')[0];
    a.download = `backup_planilhas_${dataAtual}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function toggleSelectAllExport(source) {
    const checkboxes = document.querySelectorAll('.chk-export-row');
    checkboxes.forEach(chk => {
        if (chk.closest('tr').style.display !== 'none') {
            chk.checked = source.checked;
        }
    });
}

function importarBackup() {
    const input = document.getElementById('input-importar-backup');
    if (input) {
        input.value = '';
        input.click();
    }
}

function processarImportacaoBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            let db = JSON.parse(localStorage.getItem('planilha_db_rascunhos') || '{}');
            let count = 0;
            for (const key in importedData) {
                if (importedData.hasOwnProperty(key)) { db[key] = importedData[key]; count++; }
            }
            localStorage.setItem('planilha_db_rascunhos', JSON.stringify(db));
            renderizarListaRascunhos();
            showCustomAlert(`Backup importado com sucesso! ${count} processo(s) mesclado(s) ao seu banco de dados local.`);
        } catch (error) {
            console.error("Erro ao ler o arquivo de backup:", error);
            showCustomAlert("O arquivo selecionado não é um backup válido ou está corrompido.");
        }
    };
    reader.readAsText(file);
}

function imprimirRascunhosSelecionados() {
    const chkBoxes = document.querySelectorAll('.chk-export-row:checked');
    if (chkBoxes.length === 0) {
        showCustomAlert("Por favor, marque a caixa de seleção de pelo menos uma planilha para imprimir.");
        return;
    }
    
    let db = JSON.parse(localStorage.getItem('planilha_db_rascunhos') || '{}');
    let allReportsHtml = '';
    
    let validCount = 0;
    chkBoxes.forEach((chk, index) => {
        const chave = chk.value;
        if (db[chave] && db[chave].isFinal) {
            loadRascunhoToUI(db[chave]);
            atualizarQuadroResumo(); 
            let reportHtml = gerarRelatorioStr();
            allReportsHtml += `<div class="print-page-wrapper" style="${validCount > 0 ? 'page-break-before: always; padding-top: 20px;' : ''}">${reportHtml}</div>`;
            validCount++;
        }
    });
    
    if (validCount === 0) {
        showCustomAlert("Apenas planilhas com status 'Final' podem ser impressas. Nenhuma das planilhas selecionadas atende a este critério.");
        return;
    }
    
    fecharModalBancoRascunhos();
    
    const printHtml = `
        <table class="print-layout-table">
            <thead><tr><td class="print-header-space"></td></tr></thead>
            <tbody><tr><td class="print-content-cell">
                ${allReportsHtml}
            </td></tr></tbody>
            <tfoot><tr><td class="print-footer-space" style="vertical-align: bottom; padding-bottom: 15px; padding-right: 1.5cm;">
                <div class="print-footer-content" style="display: flex; justify-content: flex-end; align-items: center; font-size: 10pt; color: #000000;">
                </div>
            </td></tr></tfoot>
        </table>
    `;

    document.getElementById('report-body').innerHTML = printHtml;
    document.getElementById('relatorio-modal').style.display = 'block';
    document.body.classList.add('printing-modal');
}

function exportarExcelSelecionados() {
    const chkBoxes = document.querySelectorAll('.chk-export-row:checked');
    if (chkBoxes.length === 0) {
        showCustomAlert("Por favor, marque a caixa de seleção de pelo menos uma planilha para exportar.");
        return;
    }

    let db = JSON.parse(localStorage.getItem('planilha_db_rascunhos') || '{}');
    
    let allKeys = new Set();
    let selectedData = [];
    
    chkBoxes.forEach(chk => {
        const chave = chk.value;
        const rascunho = db[chave];
        if (rascunho && rascunho.payload && rascunho.payload.inputs) {
            const inputs = rascunho.payload.inputs;
            const historyValidoExcel = (rascunho.history || []).filter(h => h.isFinal);
            inputs['status_planilha'] = rascunho.isFinal ? 'Final' : 'Rascunho';
            inputs['data_modificacao'] = new Date(rascunho.timestamp).toLocaleString('pt-BR');
            inputs['status_alteracoes'] = (historyValidoExcel.length > 0) ? `Modificada (${historyValidoExcel.length} versão(ões) anterior(es))` : 'Original / Sem modificações';
            selectedData.push(inputs);
            
            Object.keys(inputs).forEach(k => {
                if (k === 'proc-num' || k === 'proc-digito' || k === 'proc-ano') return;
                if (!k.endsWith('_readOnly') && !k.endsWith('_dataset') && !k.endsWith('_span') && !k.includes('incluir-fgts-base') && !k.includes('adv-calculo-tipo') && !k.includes('-opt') && !k.includes('chk-perc')) {
                    const val = inputs[k];
                    if (val !== null && val !== undefined && val !== '' && val !== false && val !== '0,00' && val !== '0' && val !== '0,00%') {
                        allKeys.add(k);
                    }
                }
            });
            
            Object.keys(inputs).forEach(k => {
                if (k.endsWith('_span') && (k.includes('liquido') || k.includes('resultado') || k.includes('bruto') || k.includes('base-calculo'))) {
                    const val = inputs[k];
                    if (val !== '0,00' && val !== '0') {
                        allKeys.add(k);
                    }
                }
            });
        }
    });

    const orderedBaseKeys = [
        'status_planilha', 'data_modificacao', 'status_alteracoes',
        'data-liberacao-header', 'nome-servidor', 'id-planilha',
        'reclamante', 'cpf', 'liquido-reclamante-calculo',
        'id-deposito', 'conta-judicial', 'valor-deposito',
        'fgts-viculada', 'valor-previdencia-privada', 'nome-fundo-previdencia', 'cnpj-fundo-previdencia',
        'ir-valor', 'inss-reclamante', 'inss-reclamada', 'input-custas-judiciais',
        'pensao-beneficiario', 'pensao-cpf', 'pensao-alimenticia',
        'outras-motivo', 'outras-retencoes',
        'input-honorarios-advocaticios', 'input-irrf-honorarios',
        'adv-base-calculo_span', 'adv-percentual', 'adv-valor-fixado',
        'input-honorarios-periciais', 'input-irrf-periciais',
        'valor-bruto-reclamante_span', 'observacoes-gerais'
    ];

    let keysArray = Array.from(allKeys);
    keysArray.sort((a, b) => {
        let idxA = orderedBaseKeys.indexOf(a);
        let idxB = orderedBaseKeys.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        
        if (a.startsWith('adv') && !b.startsWith('adv')) return -1;
        if (!a.startsWith('adv') && b.startsWith('adv')) return 1;
        if (a.startsWith('her') && !b.startsWith('her')) return -1;
        if (!a.startsWith('her') && b.startsWith('her')) return 1;
        
        return a.localeCompare(b);
    });

    const getLabel = (k) => {
        const map = {
            'processo_completo': 'Processo Completo',
            'status_planilha': 'Status da Planilha',
            'data_modificacao': 'Data da Modificação',
            'status_alteracoes': 'Status das Alterações',
            'data-liberacao-header': 'Data Liberação',
            'nome-servidor': 'Servidor(a)',
            'id-planilha': 'ID Planilha',
            'reclamante': 'Reclamante',
            'cpf': 'CPF/CNPJ Reclamante',
            'id-deposito': 'ID Depósito',
            'conta-judicial': 'Conta Judicial',
            'valor-deposito': 'Valor Depósito',
            'liquido-reclamante-calculo': 'Líquido Reclamante',
            'fgts-viculada': 'FGTS',
            'valor-previdencia-privada': 'Previdência Privada',
            'nome-fundo-previdencia': 'Nome Fundo Prev.',
            'cnpj-fundo-previdencia': 'CNPJ Fundo Prev.',
            'ir-valor': 'IRRF Reclamante',
            'inss-reclamante': 'INSS Reclamante',
            'inss-reclamada': 'INSS Executada',
            'input-custas-judiciais': 'Custas Judiciais',
            'pensao-beneficiario': 'Beneficiário Pensão',
            'pensao-cpf': 'CPF Pensão',
            'pensao-alimenticia': 'Valor Pensão',
            'outras-motivo': 'Motivo Outras Retenções',
            'outras-retencoes': 'Valor Outras Retenções',
            'input-honorarios-advocaticios': 'Hon. Adv. (Planilha)',
            'input-irrf-honorarios': 'IRRF Hon. Adv. (Planilha)',
            'adv-base-calculo_span': 'Base Calc. Hon. Contratuais',
            'adv-percentual': 'Perc. Hon. Contratuais',
            'adv-valor-fixado': 'Valor Fixado Hon. Contratuais',
            'input-honorarios-periciais': 'Hon. Periciais (Planilha)',
            'input-irrf-periciais': 'IRRF Hon. Periciais (Planilha)',
            'valor-bruto-reclamante_span': 'Total Devido Reclamada',
            'observacoes-gerais': 'Observações',
            'adv-nome-principal': 'Nome Adv. 1',
            'adv-cpf-principal': 'CPF/CNPJ Adv. 1',
            'adv-principal-percentual': 'Rateio % Adv. 1',
            'adv-principal-resultado': 'Bruto Adv. 1',
            'adv-principal-ir': 'IRRF Adv. 1',
            'adv-principal-retencao': 'Retenção Adv. 1',
            'adv-principal-retencao-motivo': 'Motivo Ret. Adv. 1',
            'adv-principal-liquido_span': 'Líquido Adv. 1',
            'perito-nome-principal': 'Nome Perito 1',
            'perito-cpf-principal': 'CPF/CNPJ Perito 1',
            'perito-principal-resultado': 'Bruto Perito 1',
            'perito-principal-ir': 'IRRF Perito 1',
            'perito-principal-retencao': 'Retenção Perito 1',
            'perito-principal-retencao-motivo': 'Motivo Ret. Perito 1',
            'perito-principal-liquido_span': 'Líquido Perito 1'
        };
        if (map[k]) return map[k];

        let match;
        if ((match = k.match(/^adv-ad-nome-(\d+)$/))) return `Nome Adv. ${parseInt(match[1])+1}`;
        if ((match = k.match(/^adv-ad-cpf-(\d+)$/))) return `CPF/CNPJ Adv. ${parseInt(match[1])+1}`;
        if ((match = k.match(/^adv-ad-percentual-(\d+)$/))) return `Rateio % Adv. ${parseInt(match[1])+1}`;
        if ((match = k.match(/^adv-ad-resultado-(\d+)$/))) return `Bruto Adv. ${parseInt(match[1])+1}`;
        if ((match = k.match(/^adv-ad-ir-(\d+)$/))) return `IRRF Adv. ${parseInt(match[1])+1}`;
        if ((match = k.match(/^adv-ad-retencao-(\d+)$/))) return `Retenção Adv. ${parseInt(match[1])+1}`;
        if ((match = k.match(/^adv-ad-retencao-motivo-(\d+)$/))) return `Motivo Ret. Adv. ${parseInt(match[1])+1}`;
        if ((match = k.match(/^adv-ad-liquido-(\d+)_span$/))) return `Líquido Adv. ${parseInt(match[1])+1}`;

        if ((match = k.match(/^adv-suc-nome-(\d+)$/))) return `Nome Adv. Sucumb. ${match[1]}`;
        if ((match = k.match(/^adv-suc-cpf-(\d+)$/))) return `CPF/CNPJ Adv. Sucumb. ${match[1]}`;
        if ((match = k.match(/^adv-suc-resultado-(\d+)$/))) return `Bruto Adv. Sucumb. ${match[1]}`;
        if ((match = k.match(/^adv-suc-ir-(\d+)$/))) return `IRRF Adv. Sucumb. ${match[1]}`;
        if ((match = k.match(/^adv-suc-retencao-(\d+)$/))) return `Retenção Adv. Sucumb. ${match[1]}`;
        if ((match = k.match(/^adv-suc-retencao-motivo-(\d+)$/))) return `Motivo Ret. Adv. Sucumb. ${match[1]}`;
        if ((match = k.match(/^adv-suc-liquido-(\d+)_span$/))) return `Líquido Adv. Sucumb. ${match[1]}`;
        
        if ((match = k.match(/^perito-ad-nome-(\d+)$/))) return `Nome Perito ${parseInt(match[1])+1}`;
        if ((match = k.match(/^perito-ad-cpf-(\d+)$/))) return `CPF/CNPJ Perito ${parseInt(match[1])+1}`;
        if ((match = k.match(/^perito-ad-resultado-(\d+)$/))) return `Bruto Perito ${parseInt(match[1])+1}`;
        if ((match = k.match(/^perito-ad-ir-(\d+)$/))) return `IRRF Perito ${parseInt(match[1])+1}`;
        if ((match = k.match(/^perito-ad-retencao-(\d+)$/))) return `Retenção Perito ${parseInt(match[1])+1}`;
        if ((match = k.match(/^perito-ad-retencao-motivo-(\d+)$/))) return `Motivo Ret. Perito ${parseInt(match[1])+1}`;
        if ((match = k.match(/^perito-ad-liquido-(\d+)_span$/))) return `Líquido Perito ${parseInt(match[1])+1}`;

        if ((match = k.match(/^her-nome-(\d+)$/))) return `Nome Herdeiro ${match[1]}`;
        if ((match = k.match(/^her-cpf-(\d+)$/))) return `CPF/CNPJ Herdeiro ${match[1]}`;
        if ((match = k.match(/^her-percentual-(\d+)$/))) return `Rateio % Herdeiro ${match[1]}`;
        if ((match = k.match(/^her-resultado-(\d+)$/))) return `Bruto Herdeiro ${match[1]}`;
        if ((match = k.match(/^her-retencao-(\d+)$/))) return `Retenção Herdeiro ${match[1]}`;
        if ((match = k.match(/^her-retencao-motivo-(\d+)$/))) return `Motivo Ret. Herdeiro ${match[1]}`;
        if ((match = k.match(/^her-liquido-(\d+)_span$/))) return `Líquido Herdeiro ${match[1]}`;

        if ((match = k.match(/^ces-nome-(\d+)$/))) return `Nome Cessionário ${match[1]}`;
        if ((match = k.match(/^ces-cpf-(\d+)$/))) return `CPF/CNPJ Cessionário ${match[1]}`;
        if ((match = k.match(/^ces-percentual-(\d+)$/))) return `Rateio % Cessionário ${match[1]}`;
        if ((match = k.match(/^ces-resultado-(\d+)$/))) return `Bruto Cessionário ${match[1]}`;
        if ((match = k.match(/^ces-retencao-(\d+)$/))) return `Retenção Cessionário ${match[1]}`;
        if ((match = k.match(/^ces-retencao-motivo-(\d+)$/))) return `Motivo Ret. Cessionário ${match[1]}`;
        if ((match = k.match(/^ces-liquido-(\d+)_span$/))) return `Líquido Cessionário ${match[1]}`;

        if ((match = k.match(/^her-adv-nome-(\d+)$/))) return `Nome Adv. do Herdeiro (ID ${match[1]})`;
        if ((match = k.match(/^her-adv-cpf-(\d+)$/))) return `CPF/CNPJ Adv. do Herdeiro (ID ${match[1]})`;
        if ((match = k.match(/^her-adv-part-(\d+)$/))) return `Rateio % Adv. do Herdeiro (ID ${match[1]})`;
        if ((match = k.match(/^her-adv-resultado-(\d+)$/))) return `Bruto Adv. do Herdeiro (ID ${match[1]})`;
        if ((match = k.match(/^her-adv-ir-(\d+)$/))) return `IRRF Adv. do Herdeiro (ID ${match[1]})`;
        if ((match = k.match(/^her-adv-ret-(\d+)$/))) return `Retenção Adv. do Herdeiro (ID ${match[1]})`;
        if ((match = k.match(/^her-adv-ret-motivo-(\d+)$/))) return `Motivo Ret. Adv. do Herdeiro (ID ${match[1]})`;
        if ((match = k.match(/^her-adv-liquido-(\d+)_span$/))) return `Líquido Adv. do Herdeiro (ID ${match[1]})`;

        if ((match = k.match(/^ces-adv-nome-(\d+)$/))) return `Nome Adv. do Cessionário (ID ${match[1]})`;
        if ((match = k.match(/^ces-adv-cpf-(\d+)$/))) return `CPF/CNPJ Adv. do Cessionário (ID ${match[1]})`;
        if ((match = k.match(/^ces-adv-part-(\d+)$/))) return `Rateio % Adv. do Cessionário (ID ${match[1]})`;
        if ((match = k.match(/^ces-adv-resultado-(\d+)$/))) return `Bruto Adv. do Cessionário (ID ${match[1]})`;
        if ((match = k.match(/^ces-adv-ir-(\d+)$/))) return `IRRF Adv. do Cessionário (ID ${match[1]})`;
        if ((match = k.match(/^ces-adv-ret-(\d+)$/))) return `Retenção Adv. do Cessionário (ID ${match[1]})`;
        if ((match = k.match(/^ces-adv-ret-motivo-(\d+)$/))) return `Motivo Ret. Adv. do Cessionário (ID ${match[1]})`;
        if ((match = k.match(/^ces-adv-liquido-(\d+)_span$/))) return `Líquido Adv. do Cessionário (ID ${match[1]})`;
        
        let label = k.replace(/_span/g, '').replace(/-/g, ' ');
        label = label.replace(/\b\w/g, l => l.toUpperCase());
        return label;
    };

    const finalKeys = ['processo_completo', ...keysArray];
    const headers = finalKeys.map(k => getLabel(k));

    let csvContent = "\uFEFF";
    csvContent += headers.join(";") + "\n";
    
    selectedData.forEach(inputs => {
        const procCompleto = `${inputs['proc-num'] || ''}-${inputs['proc-digito'] || ''}.${inputs['proc-ano'] || ''}.5.19.0000`;
        
        const row = finalKeys.map(k => {
            if (k === 'processo_completo') return procCompleto;
            let val = inputs[k];
            if (val === undefined || val === null) return '';
            
            let cellStr = val.toString();
            
            if (cellStr.includes(';') || cellStr.includes('\n') || cellStr.includes('\r') || cellStr.includes('"')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        });
        csvContent += row.join(";") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dataAtual = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `planilhas_exportadas_${dataAtual}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function toggleHistorico(chave) {
    const className = `historico-row-${chave.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const rows = document.querySelectorAll(`.${className}`);
    rows.forEach(row => {
        row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    });
}

function setModoVisualizacao(isReadOnly) {
    const inputs = document.querySelectorAll('.container input:not(#pesquisa-rascunhos):not(#chk-nao-mostrar-ajuda), .container textarea, .container select');
    inputs.forEach(el => {
        el.disabled = isReadOnly;
    });
    
    const actionButtons = document.querySelectorAll('.container .add-button, .container .btn-delete-block, .container .btn-clear-block, .container .add-adv-esp-btn, .container .btn-calc-honorarios');
    actionButtons.forEach(btn => {
        if (btn.tagName === 'BUTTON') {
            btn.disabled = isReadOnly;
            btn.style.opacity = isReadOnly ? '0.5' : '1';
            btn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }
    });

    const salvarBtn = document.querySelector('button[onclick="abrirOpcoesSalvamento()"]');
    if (salvarBtn) {
        salvarBtn.disabled = isReadOnly;
        salvarBtn.style.opacity = isReadOnly ? '0.5' : '1';
        salvarBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
    }

    let banner = document.getElementById('view-mode-banner');
    if (isReadOnly) {
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'view-mode-banner';
            banner.style.cssText = 'background-color: #fff3cd; color: #856404; padding: 12px; text-align: center; font-size: 1.1em; border: 1px solid #ffeeba; border-radius: 8px; margin-bottom: 20px;';
            banner.innerHTML = '<i class="fas fa-eye" style="margin-right: 8px;"></i><strong>MODO DE VISUALIZAÇÃO</strong> - A planilha está bloqueada para alterações.';
            const header = document.querySelector('.header');
            if (header && header.parentNode) {
                header.parentNode.insertBefore(banner, header.nextSibling);
            }
        }
    } else {
        if (banner) banner.remove();
    }
}