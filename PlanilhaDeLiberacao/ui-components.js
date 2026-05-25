// =======================================================================
// GERENCIAMENTO DE INTERFACE E LIMPEZA
// =======================================================================

function iniciarAdvogadoHerdeiro(id) {
    document.getElementById(`her-adv-container-${id}`).style.display = 'block';
    document.getElementById(`btn-add-adv-esp-her-${id}`).style.display = 'none';
    adicionarAdvogadoHerdeiro(id);
}

function iniciarAdvogadoCessionario(id) {
    document.getElementById(`ces-adv-container-${id}`).style.display = 'block';
    document.getElementById(`btn-add-adv-esp-ces-${id}`).style.display = 'none';
    adicionarAdvogadoCessionario(id);
}

function confirmarExclusaoBloco(id, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    showCustomConfirm('Deseja realmente excluir estes dados?', function(res) {
        if (res) {
            if (id.startsWith('her-adv-block-')) {
                const el = document.getElementById(id);
                if (el) {
                    const classList = Array.from(el.classList);
                    const herdeiroClass = classList.find(c => c.startsWith('adv-herdeiro-'));
                    const herdeiroId = herdeiroClass ? herdeiroClass.split('-')[2] : null;
                    const advId = el.dataset.advId;
                    if (herdeiroId && advId) removerAdvogadoHerdeiro(advId, herdeiroId);
                    else removerParte(id);
                }
            } else if (id.startsWith('ces-adv-block-')) {
                const el = document.getElementById(id);
                if (el) {
                    const classList = Array.from(el.classList);
                    const cessionarioClass = classList.find(c => c.startsWith('adv-cessionario-'));
                    const cessionarioId = cessionarioClass ? cessionarioClass.split('-')[2] : null;
                    const advId = el.dataset.advId;
                    if (cessionarioId && advId) removerAdvogadoCessionario(advId, cessionarioId);
                    else removerParte(id);
                }
            } else if (id.startsWith('adv-adicional-') || 
                       id.startsWith('adv-sucumbencial-') || 
                       id.startsWith('perito-adicional-') || 
                       id.startsWith('herdeiro-') || 
                       id.startsWith('cessionario-')) {
                removerParte(id);
            } else if (id === 'adv-principal-block') {
                removerAdvogadoPrincipal();
            } else if (id === 'perito-principal-block') {
                removerPeritoPrincipal();
            } else {
                limparBloco(id);
            }
        }
    });
}

function limparBloco(containerId, force = false) {
    const container = document.getElementById(containerId);
    if (!container) return false;

    if (!force && (containerId.includes('adv-principal-block') || containerId.includes('adv-adicional-') || containerId.includes('adv-sucumbencial-') || containerId.includes('perito-principal-block') || containerId.includes('perito-adicional-'))) {
        const resInputs = container.querySelectorAll('input[id*="-resultado"]');
        let isProtected = false;
        resInputs.forEach(input => {
            if (input.readOnly) isProtected = true;
        });
        if (isProtected) {
            showCustomAlert("Qualquer alteração deve ser feita diretamente no lançamentos de honorários nas informações oriundas da planilha de atualização de cálculos.");
            return false;
        }
    }

    container.querySelectorAll('input').forEach(input => {
        if (input.type === 'text' || input.type === 'number') {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (input.type === 'checkbox') {
            if (input.checked) {
                input.checked = false;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });

    container.querySelectorAll('span').forEach(span => {
        if (span.id && (span.id.includes('resultado') || span.id.includes('liquido') || span.id.includes('base-calculo') || span.classList.contains('valor-display-style'))) {
            if (span.id !== 'valor-bruto-reclamante') {
                span.textContent = '0,00';
            }
        }
    });

    if (containerId.includes('adv-principal-block') || containerId.includes('adv-adicional-')) {
        sincronizarAdvogadosParaGeral();
    } else if (containerId.includes('perito-principal-block') || containerId.includes('perito-adicional-')) {
        sincronizarPeritosParaPrincipal();
    } else if (containerId === 'bloco-honorarios-geral') {
        const advValorFixado = document.getElementById('adv-valor-fixado');
        if (advValorFixado) { advValorFixado.value = ''; advValorFixado.dataset.manual = 'false'; }
        const advPercentual = document.getElementById('adv-percentual');
        if (advPercentual) advPercentual.value = '';
        atualizarPlanilhaHonorariosAdvocaticios();
        verificarTravasHonorarios();
    } else if (containerId === 'bloco-honorarios-sucumbenciais') {
        const existingSucs = [];
        for (let i = 1; i <= advSucumbencialCount; i++) existingSucs.push(i);
        existingSucs.forEach(i => removerParte(`adv-sucumbencial-${i}`));
        advSucumbencialCount = 0;
        sincronizarSucumbenciaisParaGeral();
    } else if (containerId.includes('adv-sucumbencial-')) {
        sincronizarSucumbenciaisParaGeral();
    }

    atualizarSomaLiquido();
    atualizarCredoresAdicionais();
    return true;
}

function limparBlocoPlanilha() {
    limparBloco('bloco-planilha');

    window.lastAbaAdvHonNet = 0;
    window.lastAbaAdvIrrfTotal = 0;

    const manualAdvs = [];
    const checkAdvBlock = (suffix) => {
        const nomeId = suffix === 'principal' ? 'adv-nome-principal' : `adv-ad-nome-${suffix}`;
        const nomeEl = document.getElementById(nomeId);
        const resEl = document.getElementById(suffix === 'principal' ? 'adv-principal-resultado' : `adv-ad-resultado-${suffix}`);
        if (nomeEl && resEl && !resEl.readOnly) {
            const cpf = document.getElementById(suffix === 'principal' ? 'adv-cpf-principal' : `adv-ad-cpf-${suffix}`)?.value || '';
            const perc = document.getElementById(suffix === 'principal' ? 'adv-principal-percentual' : `adv-ad-percentual-${suffix}`)?.value || '';
            const hon = resEl ? (resEl.tagName === 'INPUT' ? resEl.value : resEl.textContent) : '';
            const ir = document.getElementById(suffix === 'principal' ? 'adv-principal-ir' : `adv-ad-ir-${suffix}`)?.value || '';
            const ret = document.getElementById(suffix === 'principal' ? 'adv-principal-retencao' : `adv-ad-retencao-${suffix}`)?.value || '';
            const mot = document.getElementById(suffix === 'principal' ? 'adv-principal-retencao-motivo' : `adv-ad-retencao-motivo-${suffix}`)?.value || '';
            
            if (nomeEl.value || cpf || hon || ir || ret) {
                manualAdvs.push({nome: nomeEl.value, cpf, perc, hon, ir, ret, mot});
            }
        }
    };
    checkAdvBlock('principal');
    for (let i = 1; i <= advogadoAdicionalCount; i++) checkAdvBlock(i);

    removerAdvogadoPrincipal(true); 
    setBlockReadonly('adv', 'principal', false);
    const existingAdicionais = [];
    for (let i = 1; i <= advogadoAdicionalCount; i++) existingAdicionais.push(i);
    existingAdicionais.forEach(i => removerParte(`adv-adicional-${i}`, true));
    advogadoAdicionalCount = 0;

    const listAdvModal = document.getElementById('lista-advogados-modal');
    if (listAdvModal) listAdvModal.innerHTML = '';
    modalAdvogadosCount = 0;

    const totalHonAdvModal = document.getElementById('total-hon-adv-modal');
    if (totalHonAdvModal) totalHonAdvModal.textContent = '0,00';
    const totalIrrfAdvModal = document.getElementById('total-irrf-adv-modal');
    if (totalIrrfAdvModal) totalIrrfAdvModal.textContent = '0,00';

    let totalInsertedAdv = 0;
    const applyToBlockAdv = (data) => {
        let targetSuffix = totalInsertedAdv === 0 ? 'principal' : '';
        if (totalInsertedAdv > 0) {
            adicionarAdvogadoAdicional();
            targetSuffix = advogadoAdicionalCount;
        } else {
            const princBlock = document.getElementById('adv-principal-block');
            if (princBlock) {
                princBlock.style.display = 'block';
                princBlock.open = true;
            }
            targetSuffix = 'principal';
        }

        const nId = targetSuffix === 'principal' ? 'adv-nome-principal' : `adv-ad-nome-${targetSuffix}`;
        const cId = targetSuffix === 'principal' ? 'adv-cpf-principal' : `adv-ad-cpf-${targetSuffix}`;
        const resId = targetSuffix === 'principal' ? 'adv-principal-resultado' : `adv-ad-resultado-${targetSuffix}`;
        const irId = targetSuffix === 'principal' ? 'adv-principal-ir' : `adv-ad-ir-${targetSuffix}`;
        const retId = targetSuffix === 'principal' ? 'adv-principal-retencao' : `adv-ad-retencao-${targetSuffix}`;
        const motId = targetSuffix === 'principal' ? 'adv-principal-retencao-motivo' : `adv-ad-retencao-motivo-${targetSuffix}`;
        const percId = targetSuffix === 'principal' ? 'adv-principal-percentual' : `adv-ad-percentual-${targetSuffix}`;

        if (document.getElementById(nId)) document.getElementById(nId).value = data.nome || '';
        if (document.getElementById(cId)) document.getElementById(cId).value = data.cpf || '';
        if (document.getElementById(irId)) document.getElementById(irId).value = data.ir || '';
        if (document.getElementById(retId)) document.getElementById(retId).value = data.ret || '';
        if (document.getElementById(motId)) document.getElementById(motId).value = data.mot || '';
        if (document.getElementById(percId)) document.getElementById(percId).value = data.perc || '';

        const resEl = document.getElementById(resId);
        if (resEl) {
            if (resEl.tagName === 'INPUT') resEl.value = data.hon || '';
            else resEl.textContent = data.hon || '0,00';
        }

        setBlockReadonly('adv', targetSuffix, false);
        atualizarLiquidoAdvogado(targetSuffix);
        totalInsertedAdv++;
    };
    manualAdvs.forEach(m => applyToBlockAdv(m));

    if (totalInsertedAdv === 0) {
        const advPrincBlock = document.getElementById('adv-principal-block');
        if (advPrincBlock) advPrincBlock.style.display = 'none';
    }

    const advPercOpt = document.getElementById('adv-percentual-opt');
    if (advPercOpt) advPercOpt.checked = true;
    document.querySelectorAll('input[name="incluir-fgts-base"], input[name="incluir-fgts-base-her"], input[name="incluir-fgts-base-ces"]').forEach(r => r.checked = false);
    const containerFgts = document.getElementById('container-fgts-base-adv');
    if (containerFgts) containerFgts.style.display = 'none';
    const containerFgtsHer = document.getElementById('container-fgts-base-her');
    if (containerFgtsHer) containerFgtsHer.style.display = 'none';
    const containerFgtsCes = document.getElementById('container-fgts-base-ces');
    if (containerFgtsCes) containerFgtsCes.style.display = 'none';
    toggleAdvHonorariosFields();

    const advValorFixado = document.getElementById('adv-valor-fixado');
    if (advValorFixado) {
        advValorFixado.dataset.manual = 'false';
        advValorFixado.dataset.origem = '';
    }

    sincronizarAdvogadosParaGeral();

    const manualSucs = [];
    for (let i = 1; i <= advSucumbencialCount; i++) {
        const resEl = document.getElementById(`adv-suc-resultado-${i}`);
        if (resEl && !resEl.readOnly) {
            const nome = document.getElementById(`adv-suc-nome-${i}`)?.value || '';
            const cpf = document.getElementById(`adv-suc-cpf-${i}`)?.value || '';
            const hon = resEl.tagName === 'INPUT' ? resEl.value : resEl.textContent;
            const ir = document.getElementById(`adv-suc-ir-${i}`)?.value || '';
            const ret = document.getElementById(`adv-suc-retencao-${i}`)?.value || '';
            const mot = document.getElementById(`adv-suc-retencao-motivo-${i}`)?.value || '';
            if (nome || cpf || hon || ir || ret) {
                manualSucs.push({nome, cpf, hon, ir, ret, mot});
            }
        }
    }

    const existingSucs = [];
    for (let i = 1; i <= advSucumbencialCount; i++) existingSucs.push(i);
    existingSucs.forEach(i => removerParte(`adv-sucumbencial-${i}`, true));
    advSucumbencialCount = 0;

    const listSucModal = document.getElementById('lista-sucumbenciais-modal');
    if (listSucModal) listSucModal.innerHTML = '';
    modalSucumbenciaisCount = 0;
    
    const applyToBlockSucPlanilha = (data) => {
        adicionarAdvogadoSucumbencial();
        const targetSuffix = advSucumbencialCount;
        document.getElementById(`adv-suc-nome-${targetSuffix}`).value = data.nome || '';
        document.getElementById(`adv-suc-cpf-${targetSuffix}`).value = data.cpf || '';
        document.getElementById(`adv-suc-ir-${targetSuffix}`).value = data.ir || '';
        document.getElementById(`adv-suc-retencao-${targetSuffix}`).value = data.ret || '';
        document.getElementById(`adv-suc-retencao-motivo-${targetSuffix}`).value = data.mot || '';
        const resEl = document.getElementById(`adv-suc-resultado-${targetSuffix}`);
        if (resEl) {
            if (resEl.tagName === 'INPUT') resEl.value = data.hon || '';
            else resEl.textContent = data.hon || '0,00';
        }
        setBlockReadonly('suc', targetSuffix, false);
        atualizarLiquidoSucumbencial(targetSuffix);
    };
    manualSucs.forEach(m => applyToBlockSucPlanilha(m));
    sincronizarSucumbenciaisParaGeral();

    const manualPers = [];
    const checkPerBlock = (suffix) => {
        const nomeId = suffix === 'principal' ? 'perito-nome-principal' : `perito-ad-nome-${suffix}`;
        const nomeEl = document.getElementById(nomeId);
        const resEl = document.getElementById(suffix === 'principal' ? 'perito-principal-resultado' : `perito-ad-resultado-${suffix}`);
        if (nomeEl && resEl && !resEl.readOnly) {
            const cpf = document.getElementById(suffix === 'principal' ? 'perito-cpf-principal' : `perito-ad-cpf-${suffix}`)?.value || '';
            const hon = resEl ? (resEl.tagName === 'INPUT' ? resEl.value : resEl.textContent) : '';
            const ir = document.getElementById(suffix === 'principal' ? 'perito-principal-ir' : `perito-ad-ir-${suffix}`)?.value || '';
            const ret = document.getElementById(suffix === 'principal' ? 'perito-principal-retencao' : `perito-ad-retencao-${suffix}`)?.value || '';
            const mot = document.getElementById(suffix === 'principal' ? 'perito-principal-retencao-motivo' : `perito-ad-retencao-motivo-${suffix}`)?.value || '';
            
            if (nomeEl.value || cpf || hon || ir || ret) {
                manualPers.push({nome: nomeEl.value, cpf, hon, ir, ret, mot});
            }
        }
    };
    checkPerBlock('principal');
    for (let i = 1; i <= peritoAdicionalCount; i++) checkPerBlock(i);

    removerPeritoPrincipal(true); 
    setBlockReadonly('perito', 'principal', false);
    const existingAdicionaisPer = [];
    for (let i = 1; i <= peritoAdicionalCount; i++) existingAdicionaisPer.push(i);
    existingAdicionaisPer.forEach(i => removerParte(`perito-adicional-${i}`, true));
    peritoAdicionalCount = 0;

    const listPerModal = document.getElementById('lista-peritos-modal');
    if (listPerModal) listPerModal.innerHTML = '';
    modalPeritosCount = 0;

    const totalHonPerModal = document.getElementById('total-hon-per-modal');
    if (totalHonPerModal) totalHonPerModal.textContent = '0,00';
    const totalIrrfPerModal = document.getElementById('total-irrf-per-modal');
    if (totalIrrfPerModal) totalIrrfPerModal.textContent = '0,00';

    let totalInsertedPer = 0;
    const applyToBlockPer = (data) => {
        let targetSuffix = totalInsertedPer === 0 ? 'principal' : '';
        if (totalInsertedPer > 0) {
            adicionarPeritoAdicional();
            targetSuffix = peritoAdicionalCount;
        } else {
            const princBlock = document.getElementById('perito-principal-block');
            if (princBlock) {
                princBlock.style.display = 'block';
                princBlock.open = true;
            }
            targetSuffix = 'principal';
        }

        const nId = targetSuffix === 'principal' ? 'perito-nome-principal' : `perito-ad-nome-${targetSuffix}`;
        const cId = targetSuffix === 'principal' ? 'perito-cpf-principal' : `perito-ad-cpf-${targetSuffix}`;
        const resId = targetSuffix === 'principal' ? 'perito-principal-resultado' : `perito-ad-resultado-${targetSuffix}`;
        const irId = targetSuffix === 'principal' ? 'perito-principal-ir' : `perito-ad-ir-${targetSuffix}`;
        const retId = targetSuffix === 'principal' ? 'perito-principal-retencao' : `perito-ad-retencao-${targetSuffix}`;
        const motId = targetSuffix === 'principal' ? 'perito-principal-retencao-motivo' : `perito-ad-retencao-motivo-${targetSuffix}`;

        if (document.getElementById(nId)) document.getElementById(nId).value = data.nome || '';
        if (document.getElementById(cId)) document.getElementById(cId).value = data.cpf || '';
        if (document.getElementById(irId)) document.getElementById(irId).value = data.ir || '';
        if (document.getElementById(retId)) document.getElementById(retId).value = data.ret || '';
        if (document.getElementById(motId)) document.getElementById(motId).value = data.mot || '';

        const resEl = document.getElementById(resId);
        if (resEl) {
            if (resEl.tagName === 'INPUT') resEl.value = data.hon || '';
            else resEl.textContent = data.hon || '0,00';
        }

        setBlockReadonly('perito', targetSuffix, false);
        atualizarLiquidoPerito(targetSuffix);
        totalInsertedPer++;
    };
    manualPers.forEach(m => applyToBlockPer(m));

    if (totalInsertedPer === 0) {
        const perPrincBlock = document.getElementById('perito-principal-block');
        if (perPrincBlock) perPrincBlock.style.display = 'none';
    }

    sincronizarPeritosParaPrincipal();
    atualizarCredoresAdicionais();
    atualizarSomaLiquido();
}

// =======================================================================
// VALIDAÇÕES VISUAIS E RATEIOS
// =======================================================================

function validarRetencoes(input) {
    const credito = getNumericValue('liquido-reclamante-calculo');
    const pensao = getNumericValue('pensao-alimenticia');
    const outras = getNumericValue('outras-retencoes');

    if ((pensao + outras) > credito) {
        showCustomAlert('A soma das retenções (Pensão + Outras) não pode exceder o Crédito do Reclamante.');

        let maximo = 0;
        if (input.id === 'pensao-alimenticia') {
            maximo = Math.max(0, credito - outras);
        } else if (input.id === 'outras-retencoes') {
            maximo = Math.max(0, credito - pensao);
        }

        input.value = formatarMoedaParaExibicao(maximo);
    }
}

function validarRateioHonorarios(changedInput) {
    let totalPercentualRateio = getNumericValue('adv-principal-percentual');
    for (let i = 1; i <= advogadoAdicionalCount; i++) {
        const percentualInput = document.getElementById(`adv-ad-percentual-${i}`);
        if (percentualInput) {
            totalPercentualRateio += getNumericValue(`adv-ad-percentual-${i}`);
        }
    }

    if (totalPercentualRateio > 100.01) {
        showCustomAlert('A soma dos percentuais de rateio dos advogados não pode exceder 100%. O valor será ajustado.');
        const valorExcedido = totalPercentualRateio - 100;
        const valorAtualInput = getNumericValue(changedInput.id);
        let novoValor = valorAtualInput - valorExcedido;
        if (novoValor < 0) novoValor = 0;
        changedInput.value = novoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

function validarRateioHerdeiros(changedInput) {
    let total = 0;
    for (let i = 1; i <= herdeiroCount; i++) {
        const el = document.getElementById(`her-percentual-${i}`);
        if (el) total += getNumericValue(`her-percentual-${i}`);
    }
    if (total > 100.01) {
        showCustomAlert('A soma dos percentuais dos Herdeiros não pode exceder 100%.');
        const excedente = total - 100;
        const currentVal = getNumericValue(changedInput.id);
        let newVal = Math.max(0, currentVal - excedente);
        changedInput.value = newVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

function validarRateioCessionarios(changedInput) {
    let total = 0;
    for (let i = 1; i <= cessionarioCount; i++) {
        const el = document.getElementById(`ces-percentual-${i}`);
        if (el) total += getNumericValue(`ces-percentual-${i}`);
    }
    if (total > 100.01) {
        showCustomAlert('A soma dos percentuais dos Cessionários não pode exceder 100%.');
        const excedente = total - 100;
        const currentVal = getNumericValue(changedInput.id);
        let newVal = Math.max(0, currentVal - excedente);
        changedInput.value = newVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

function validarRateioAdvHerdeiro(input) {
    const advBlock = input.closest('details[class*="adv-herdeiro-"]');
    if (!advBlock) return;
    const classList = Array.from(advBlock.classList);
    const herdeiroClass = classList.find(c => c.startsWith('adv-herdeiro-'));
    const herdeiroId = herdeiroClass.split('-')[2];

    let total = 0;
    const advogados = document.querySelectorAll(`.adv-herdeiro-${herdeiroId}`);
    advogados.forEach(block => {
        const advId = block.dataset.advId;
        const chk = document.getElementById(`chk-perc-her-adv-${advId}`);
        if (chk && chk.checked) {
            total += getNumericValue(`her-adv-part-${advId}`);
        }
    });

    if (total > 100.01) {
        showCustomAlert('A soma dos percentuais de participação dos advogados deste Herdeiro não pode exceder 100%.');
        const excedente = total - 100;
        const currentVal = getNumericValue(input.id);
        let newVal = Math.max(0, currentVal - excedente);
        input.value = newVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    }
}

function validarRateioAdvCessionario(input) {
    const advBlock = input.closest('details[class*="adv-cessionario-"]');
    if (!advBlock) return;
    const classList = Array.from(advBlock.classList);
    const cessionarioClass = classList.find(c => c.startsWith('adv-cessionario-'));
    const cessionarioId = cessionarioClass.split('-')[2];

    let total = 0;
    const advogados = document.querySelectorAll(`.adv-cessionario-${cessionarioId}`);
    advogados.forEach(block => {
        const advId = block.dataset.advId;
        const chk = document.getElementById(`chk-perc-ces-adv-${advId}`);
        if (chk && chk.checked) {
            total += getNumericValue(`ces-adv-part-${advId}`);
        }
    });

    if (total > 100.01) {
        showCustomAlert('A soma dos percentuais de participação dos advogados deste Cessionário não pode exceder 100%.');
        const excedente = total - 100;
        const currentVal = getNumericValue(input.id);
        let newVal = Math.max(0, currentVal - excedente);
        input.value = newVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    }
}

// =======================================================================
// VISIBILIDADE E TOGGLES
// =======================================================================

function toggleAdvHonorariosFields() {
    const isPercentual = document.getElementById('adv-percentual-opt').checked;
    document.getElementById('adv-percentual-fields').style.display = isPercentual ? 'flex' : 'none';
    document.getElementById('adv-fixado-fields').style.display = isPercentual ? 'none' : 'flex';
    
    const percInput = document.getElementById('adv-percentual');
    const fixInput = document.getElementById('adv-valor-fixado');
    if (percInput) percInput.disabled = !isPercentual;
    if (fixInput) fixInput.disabled = isPercentual;
    
    const fgts = getNumericValue('fgts-viculada');
    const containerFgts = document.getElementById('container-fgts-base-adv');
    if (containerFgts) {
        containerFgts.style.display = (isPercentual && fgts > 0) ? 'flex' : 'none';
    }
    
    const containerBase = document.getElementById('container-base-calculo-adv');
    if (containerBase) {
        containerBase.style.display = isPercentual ? 'block' : 'none';
    }
    
    calcularHonorarios('adv');
    atualizarSomaLiquido();
}

function verificarTravasHonorarios() {
    const valPercentual = getNumericValue('adv-percentual');
    const valPlanilha = getNumericValue('input-honorarios-advocaticios');
    const valAba = window.lastAbaAdvHonNet || 0;
    const manualHonNet = Math.max(0, valPlanilha - valAba);
    const valFixadoManual = getNumericValue('adv-valor-fixado');
    
    const optPerc = document.getElementById('adv-percentual-opt');
    const optFix = document.getElementById('adv-valor-fixado-opt');
    
    const inputPlanHon = document.getElementById('input-honorarios-advocaticios');
    const inputPlanIrrf = document.getElementById('input-irrf-honorarios');
    const btnHon = inputPlanHon ? inputPlanHon.parentElement.querySelector('button') : null;
    const btnIrrf = inputPlanIrrf ? inputPlanIrrf.parentElement.querySelector('button') : null;

    if (manualHonNet > 0 || valFixadoManual > 0) {
        if (optPerc) optPerc.disabled = true;
    } else {
        if (optPerc) optPerc.disabled = false;
    }

    if (valPercentual > 0) {
        if (optFix) optFix.disabled = true;
        if (inputPlanHon) { inputPlanHon.disabled = true; inputPlanHon.style.cursor = 'not-allowed'; }
        if (inputPlanIrrf) { inputPlanIrrf.disabled = true; inputPlanIrrf.style.cursor = 'not-allowed'; }
        if (btnHon) btnHon.disabled = false;
        if (btnIrrf) btnIrrf.disabled = false;
    } else {
        if (optFix) optFix.disabled = false;
        if (inputPlanHon) { inputPlanHon.disabled = false; inputPlanHon.style.cursor = 'text'; }
        if (inputPlanIrrf) { inputPlanIrrf.disabled = false; inputPlanIrrf.style.cursor = 'text'; }
        if (btnHon) btnHon.disabled = false;
        if (btnIrrf) btnIrrf.disabled = false;
    }
    
    verificarTravasAdvogadosEspecificos();
}

function verificarTravasAdvogadosEspecificos() {
    const temHonPlanilha = getNumericValue('input-honorarios-advocaticios') > 0;
    let requiresUpdate = false;

    const aplicarTrava = (prefix, count) => {
        for (let i = 1; i <= count; i++) {
            const infoContainer = document.getElementById(`${prefix}-adv-info-base-${i}`);
            const optContainer = document.getElementById(`${prefix}-adv-options-container-${i}`);
            const optFix = document.getElementById(`${prefix}-adv-opt-fix-${i}`);
            const optPerc = document.getElementById(`${prefix}-adv-opt-perc-${i}`);
            const baseContainer = document.getElementById(`${prefix}-adv-base-container-global-${i}`);

            if (temHonPlanilha) {
                if (infoContainer && infoContainer.style.display !== 'none') infoContainer.style.display = 'none';
                if (optContainer && optContainer.style.display !== 'none') optContainer.style.display = 'none';
                if (baseContainer && baseContainer.style.display !== 'none') baseContainer.style.display = 'none';
                
                if (optPerc && optPerc.checked) {
                    optPerc.checked = false;
                    if (optFix) optFix.checked = true;
                    const percFields = document.getElementById(`${prefix}-adv-perc-fields-global-${i}`);
                    const fixFields = document.getElementById(`${prefix}-adv-fix-fields-global-${i}`);
                    if (percFields) percFields.style.display = 'none';
                    if (fixFields) fixFields.style.display = 'flex';
                    requiresUpdate = true;
                }
            } else {
                if (optContainer && optContainer.style.display === 'none') optContainer.style.display = 'block';
                if (infoContainer && infoContainer.style.display === 'none') infoContainer.style.display = 'block';
                if (optPerc && optPerc.checked) {
                    if (baseContainer && baseContainer.style.display === 'none') baseContainer.style.display = 'flex';
                }
            }
        }
    };

    aplicarTrava('her', herdeiroCount);
    aplicarTrava('ces', cessionarioCount);

    if (requiresUpdate) {
        atualizarCredoresAdicionais();
    }
}

function toggleHerAdvHonorariosFields(id) {
    const isPercentual = document.getElementById(`her-adv-opt-perc-${id}`).checked;
    document.getElementById(`her-adv-perc-fields-global-${id}`).style.display = isPercentual ? 'flex' : 'none';
    document.getElementById(`her-adv-fix-fields-global-${id}`).style.display = isPercentual ? 'none' : 'flex';

    const baseContainer = document.getElementById(`her-adv-base-container-global-${id}`);
    if (baseContainer) {
        baseContainer.style.display = isPercentual ? 'flex' : 'none';
        const honPlanilha = getNumericValue('input-honorarios-advocaticios');
        baseContainer.style.display = (isPercentual && honPlanilha <= 0) ? 'flex' : 'none';
    }
    atualizarCredoresAdicionais();
}

function toggleCesAdvHonorariosFields(id) {
    const isPercentual = document.getElementById(`ces-adv-opt-perc-${id}`).checked;
    document.getElementById(`ces-adv-perc-fields-global-${id}`).style.display = isPercentual ? 'flex' : 'none';
    document.getElementById(`ces-adv-fix-fields-global-${id}`).style.display = isPercentual ? 'none' : 'flex';

    const baseContainer = document.getElementById(`ces-adv-base-container-global-${id}`);
    if (baseContainer) {
        baseContainer.style.display = isPercentual ? 'flex' : 'none';
        const honPlanilha = getNumericValue('input-honorarios-advocaticios');
        baseContainer.style.display = (isPercentual && honPlanilha <= 0) ? 'flex' : 'none';
    }
    atualizarCredoresAdicionais();
}

function atualizarNumeracaoVisuais() {
    let countAdvogado = 2;
    document.querySelectorAll('.advogado-adicional-details').forEach(el => {
        const title = el.querySelector('summary h4');
        if (title) title.textContent = `Advogado (a) ${countAdvogado}`;
        countAdvogado++;
    });

    let countPerito = 2;
    document.querySelectorAll('.perito-adicional-details').forEach(el => {
        const title = el.querySelector('summary h4');
        if (title) title.textContent = `Perito (a) ${countPerito}`;
        countPerito++;
    });

    let countHerdeiro = 1;
    document.querySelectorAll('.herdeiro-details').forEach(el => {
        const title = el.querySelector('summary h4');
        if (title) title.textContent = `Herdeiro ${countHerdeiro}`;

        let countAdvHer = 1;
        el.querySelectorAll('details[class*="adv-herdeiro-"]').forEach(advEl => {
            const advTitle = advEl.querySelector('summary h5');
            if (advTitle) advTitle.textContent = `Advogado (a) ${countAdvHer} (Herdeiro ${countHerdeiro})`;
            countAdvHer++;
        });
        countHerdeiro++;
    });

    let countCessionario = 1;
    document.querySelectorAll('.cessionario-details').forEach(el => {
        const title = el.querySelector('summary h4');
        if (title) title.textContent = `Cessionário ${countCessionario}`;

        let countAdvCes = 1;
        el.querySelectorAll('details[class*="adv-cessionario-"]').forEach(advEl => {
            const advTitle = advEl.querySelector('summary h5');
            if (advTitle) advTitle.textContent = `Advogado (a) ${countAdvCes} (Cessionário ${countCessionario})`;
            countAdvCes++;
        });
        countCessionario++;
    });
}

// =======================================================================
// ADIÇÃO E REMOÇÃO DE PARTES E BLOCOS
// =======================================================================

function adicionarPeritoAdicional(isManual = false) {
    if (isManual) {
        const honPerPlanilha = getNumericValue('input-honorarios-periciais');
        if (honPerPlanilha > 0) {
            showCustomConfirm("<strong>Atenção:</strong> Você está incluindo um perito adicional.<br><br>Confirma que se tratam de honorários EXTRAS aos já informados na Planilha de Atualização de Cálculos e que estes serão descontados do crédito do Reclamante?", function(confirmacao) {
                if (confirmacao) executarAdicionarPeritoAdicional();
            });
            return;
        }
    }
    executarAdicionarPeritoAdicional();
}

function executarAdicionarPeritoAdicional() {
    const peritoPrincipalBlock = document.getElementById('perito-principal-block');
    if (peritoPrincipalBlock && peritoPrincipalBlock.style.display === 'none') {
        peritoPrincipalBlock.style.display = 'block';
        peritoPrincipalBlock.open = true;
        return;
    }
    peritoAdicionalCount++;

    document.querySelectorAll('.perito-principal-details, .perito-adicional-details').forEach(el => el.removeAttribute('open'));

    const listDiv = document.getElementById('peritos-adicionais-list');
    const newHTML = `
        <details id="perito-adicional-${peritoAdicionalCount}" class="parte-adicional-block perito-adicional-details" open>
            <summary style="display: flex; align-items: center; border-bottom: 1px solid var(--info-border); padding-bottom: 5px; margin-bottom: 10px; background: transparent; padding-top: 0; padding-left: 0; padding-right: 0;">
                <h4 style="margin: 0; border: none; padding: 0; color: var(--dark-accent); font-size: 1.05em;">Perito (a) ${peritoAdicionalCount + 1}</h4>
                <div class="actions-block" style="margin-left: auto;">
                    <button type="button" class="btn-delete-block no-print" onclick="confirmarExclusaoBloco('perito-adicional-${peritoAdicionalCount}', event)" title="Excluir"><i class="fas fa-times"></i></button>
                </div>
            </summary>
            <div style="padding-top: 5px;">
            <div style="display: flex; gap: 20px; align-items: flex-end; margin-bottom: 15px;">
                <div style="flex-basis: 75%;">
                     <label for="perito-ad-nome-${peritoAdicionalCount}" style="font-weight: 600; color: var(--text-dark); display: block; margin-bottom: 5px;">Nome do Perito (a):</label>
                     <input type="text" id="perito-ad-nome-${peritoAdicionalCount}" oninput="formatarTextoMaiusculo(this); atualizarQuadroResumo()" spellcheck="true" class="valor-input" style="width: 100%; text-align: left; background-color: white;">
                </div>
                <div style="flex-basis: 25%;">
                    <label for="perito-ad-cpf-${peritoAdicionalCount}" style="font-weight: 600; color: var(--text-dark); display: block; margin-bottom: 5px;">CPF/CNPJ:</label>
                    <input type="text" id="perito-ad-cpf-${peritoAdicionalCount}" maxlength="18" oninput="formatarDocumento(this, 'AMBOS'); atualizarQuadroResumo()" class="valor-input" style="width: 100%; text-align: left; background-color: white;">
                </div>
            </div>
            <div style="display: flex; gap: 15px; align-items: flex-end; margin-top: 15px;">
                    <div style="flex: 0 0 135px;">
                        <label for="perito-ad-resultado-${peritoAdicionalCount}" style="font-size: 0.9em; font-weight: 600; cursor: help;" title="Valor Líquido + IRRF">Honorários Bruto <i class="fas fa-info-circle" style="color: var(--primary-color); font-size: 0.85em;"></i>:</label>
                    <input type="text" id="perito-ad-resultado-${peritoAdicionalCount}" class="valor-input" placeholder="0,00" title="Valor Líquido + IRRF" oninput="formatarMoeda(this); this.dataset.origem='aba'; atualizarLiquidoPerito('${peritoAdicionalCount}'); sincronizarPeritosParaPrincipal(); atualizarQuadroResumo()" style="width: 100%; text-align: right;">
                </div>
                <div style="flex-basis: 15%;">
                    <label for="perito-ad-ir-${peritoAdicionalCount}" style="font-size: 0.9em; font-weight: 600;">Retenção IRRF:</label>
                    <input type="text" id="perito-ad-ir-${peritoAdicionalCount}" class="valor-input" placeholder="0,00" oninput="formatarMoeda(this); atualizarLiquidoPerito('${peritoAdicionalCount}'); sincronizarPeritosParaPrincipal(); atualizarQuadroResumo()" style="width: 100%; text-align: right;">
                </div>
                <div style="flex-basis: 15%;">
                    <label for="perito-ad-retencao-${peritoAdicionalCount}" style="font-size: 0.9em; font-weight: 600;">Outras Retenções:</label>
                    <input type="text" id="perito-ad-retencao-${peritoAdicionalCount}" class="valor-input" placeholder="0,00" oninput="formatarMoeda(this); atualizarLiquidoPerito('${peritoAdicionalCount}'); atualizarQuadroResumo()" style="width: 100%; text-align: right;">
                </div>
                <div style="flex-basis: 55%;">
                    <label for="perito-ad-retencao-motivo-${peritoAdicionalCount}" style="font-size: 0.9em; font-weight: 600;">Motivo das Outras Retenções:</label>
                    <input type="text" id="perito-ad-retencao-motivo-${peritoAdicionalCount}" class="valor-input" spellcheck="true" style="width: 100%; text-align: left;" oninput="formatarTextoMaiusculo(this); atualizarQuadroResumo()">
                </div>
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                <label style="font-weight: bold; font-size: 1.1em; color: var(--dark-accent);">Honorários Líquido a Liberar:</label>
                <span id="perito-ad-liquido-${peritoAdicionalCount}" class="valor-display-style" style="background-color: #e0f7fa; width: 200px; border-color: #008080; font-size: 1.1em; text-align: right;">0,00</span>
            </div>
            </div>
        </details>`;
    listDiv.insertAdjacentHTML('beforeend', newHTML);
    atualizarNumeracaoVisuais();
    atualizarQuadroResumo();
}

function adicionarAdvogadoAdicional(isManual = false) {
    if (isManual) {
        const honPlanilha = getNumericValue('input-honorarios-advocaticios');
        
        let hasAdvogadosContratuaisDoModal = false;
        const checkBlock = (suffix) => {
            const resEl = document.getElementById(suffix === 'principal' ? 'adv-principal-resultado' : `adv-ad-resultado-${suffix}`);
            if (resEl && resEl.readOnly) {
                hasAdvogadosContratuaisDoModal = true;
            }
        };
        checkBlock('principal');
        for (let i = 1; i <= advogadoAdicionalCount; i++) {
            checkBlock(i);
        }

        if (honPlanilha > 0 && hasAdvogadosContratuaisDoModal) {
            showCustomConfirm("<strong>Atenção:</strong> Você está incluindo um advogado adicional.<br><br>Confirma que se tratam de honorários EXTRAS aos já informados na Planilha de Atualização de Cálculos e que estes serão descontados do crédito do Reclamante?", function(confirmacao) {
                if (confirmacao) executarAdicionarAdvogadoAdicional();
            });
            return;
        }
    }
    executarAdicionarAdvogadoAdicional();
}

function executarAdicionarAdvogadoAdicional() {
    const advPrincipalBlock = document.getElementById('adv-principal-block');
    if (advPrincipalBlock && advPrincipalBlock.style.display === 'none') {
        advPrincipalBlock.style.display = 'block';
        advPrincipalBlock.open = true;
        return;
    }
    advogadoAdicionalCount++;

    document.querySelectorAll('.advogado-principal-details, .advogado-adicional-details').forEach(el => el.removeAttribute('open'));

    const listDiv = document.getElementById('adv-adicionais-list');
    const newAdvHTML = `
        <details id="adv-adicional-${advogadoAdicionalCount}" class="parte-adicional-block advogado-adicional-details" open>
            <summary style="display: flex; align-items: center; border-bottom: 1px solid var(--info-border); padding-bottom: 5px; margin-bottom: 10px; background: transparent; padding-top: 0; padding-left: 0; padding-right: 0;">
                <h4 style="margin: 0; border: none; padding: 0; color: var(--dark-accent); font-size: 1.05em;">Advogado (a) ${advogadoAdicionalCount + 1}</h4>
                <div class="actions-block" style="margin-left: auto;">
                    <button type="button" class="btn-delete-block no-print" onclick="confirmarExclusaoBloco('adv-adicional-${advogadoAdicionalCount}', event)" title="Excluir"><i class="fas fa-times"></i></button>
                </div>
            </summary>
            <div style="padding-top: 5px;">
            <div style="display: flex; gap: 20px; align-items: flex-end; margin-bottom: 15px;">
                <div style="flex-basis: 75%;">
                     <label for="adv-ad-nome-${advogadoAdicionalCount}" style="font-weight: 600; color: var(--text-dark); display: block; margin-bottom: 5px;">Nome do Advogado (a):</label>
                     <input type="text" id="adv-ad-nome-${advogadoAdicionalCount}" oninput="formatarTextoMaiusculo(this); atualizarCredoresAdicionais()" spellcheck="true" class="valor-input" style="width: 100%; text-align: left; background-color: white;">
                </div>
                <div style="flex-basis: 25%;">
                    <label for="adv-ad-cpf-${advogadoAdicionalCount}" style="font-weight: 600; color: var(--text-dark); display: block; margin-bottom: 5px;">CPF/CNPJ:</label>
                    <input type="text" id="adv-ad-cpf-${advogadoAdicionalCount}" maxlength="18" oninput="formatarDocumento(this, 'AMBOS'); atualizarCredoresAdicionais()" class="valor-input" style="width: 100%; text-align: left; background-color: white;">
                </div>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end; margin-top: 15px;">
                <div style="flex: 1.5; min-width: 100px;">
                    <label for="adv-ad-percentual-${advogadoAdicionalCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Rateio (%):</label>
                    <input type="text" id="adv-ad-percentual-${advogadoAdicionalCount}" class="valor-input" placeholder="0,00%" oninput="formatarPercentual(this)" style="width: 100%; text-align: right; border: 1px solid var(--primary-color); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 0 0 135px;">
                    <label style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px; cursor: help;" title="Valor Líquido + IRRF">Honorários Bruto <i class="fas fa-info-circle" style="color: var(--primary-color); font-size: 0.85em;"></i>:</label>
                    <input type="text" id="adv-ad-resultado-${advogadoAdicionalCount}" class="valor-input" placeholder="0,00" title="Valor Líquido + IRRF" oninput="handleAdvHonorarioManual(this, '${advogadoAdicionalCount}')" style="background-color: white; width: 100%; text-align: right; font-weight: bold; border: 1px solid #ccc; color: var(--text-dark); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 1.5; min-width: 120px;">
                    <label for="adv-ad-ir-${advogadoAdicionalCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Retenção IRRF:</label>
                    <input type="text" id="adv-ad-ir-${advogadoAdicionalCount}" class="valor-input" placeholder="0,00" oninput="formatarMoeda(this); atualizarLiquidoAdvogado('${advogadoAdicionalCount}'); sincronizarAdvogadosParaGeral(); atualizarQuadroResumo()" style="width: 100%; text-align: right; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 1.5; min-width: 120px;">
                    <label for="adv-ad-retencao-${advogadoAdicionalCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Outras Retenções:</label>
                    <input type="text" id="adv-ad-retencao-${advogadoAdicionalCount}" class="valor-input" placeholder="0,00" oninput="formatarMoeda(this); atualizarLiquidoAdvogado('${advogadoAdicionalCount}'); atualizarQuadroResumo()" style="width: 100%; text-align: right; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 4; min-width: 200px;">
                    <label for="adv-ad-retencao-motivo-${advogadoAdicionalCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Motivo das Outras Retenções:</label>
                    <input type="text" id="adv-ad-retencao-motivo-${advogadoAdicionalCount}" class="valor-input" spellcheck="true" style="width: 100%; text-align: left; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);" oninput="formatarTextoMaiusculo(this); atualizarQuadroResumo()">
                </div>
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                <label style="font-weight: bold; font-size: 1.1em; color: var(--dark-accent);">Honorários Líquido a Liberar:</label>
                <span id="adv-ad-liquido-${advogadoAdicionalCount}" class="valor-display-style" style="background-color: #e0f7fa; width: 200px; border-color: #008080; font-size: 1.1em; text-align: right;">0,00</span>
            </div>
            </div>
        </details>`;
    listDiv.insertAdjacentHTML('beforeend', newAdvHTML);
    atualizarNumeracaoVisuais();
    atualizarCredoresAdicionais();
}

function adicionarAdvogadoSucumbencial(isManual = false) {
    if (isManual) {
        showCustomAlert("Não é possível adicionar honorários sucumbenciais extras manualmente.<br><br>Como esses valores são débitos da reclamada, devem constar obrigatoriamente na Planilha de Atualização de Cálculos.<br><br>Utilize o botão 'Distribuir Honorários Sucumbenciais' (Caixa de diálogo) para informar os valores.");
        return;
    }
    executarAdicionarAdvogadoSucumbencial();
}

function executarAdicionarAdvogadoSucumbencial() {
    advSucumbencialCount++;
    document.querySelectorAll('.advogado-sucumbencial-details').forEach(el => el.removeAttribute('open'));

    const listDiv = document.getElementById('adv-sucumbenciais-list');
    const newHTML = `
        <details id="adv-sucumbencial-${advSucumbencialCount}" class="parte-adicional-block advogado-sucumbencial-details" open>
            <summary style="display: flex; align-items: center; border-bottom: 1px solid var(--info-border); padding-bottom: 5px; margin-bottom: 10px; background: transparent; padding-top: 0; padding-left: 0; padding-right: 0;">
                <h4 style="margin: 0; border: none; padding: 0; color: var(--dark-accent); font-size: 1.05em;">Advogado(a) ${advSucumbencialCount} (Sucumbencial)</h4>
                <div class="actions-block" style="margin-left: auto;">
                    <button type="button" class="btn-delete-block no-print" onclick="confirmarExclusaoBloco('adv-sucumbencial-${advSucumbencialCount}', event)" title="Excluir"><i class="fas fa-times"></i></button>
                </div>
            </summary>
            <div style="padding-top: 5px;">
                <div style="display: flex; gap: 20px; align-items: flex-end; margin-bottom: 15px;">
                    <div style="flex-basis: 75%;">
                        <label for="adv-suc-nome-${advSucumbencialCount}" style="font-weight: 600; color: var(--text-dark); display: block; margin-bottom: 5px;">Nome do Advogado(a):</label>
                        <input type="text" id="adv-suc-nome-${advSucumbencialCount}" oninput="formatarTextoMaiusculo(this); atualizarQuadroResumo()" spellcheck="true" class="valor-input required-dynamic" style="width: 100%; text-align: left; background-color: white;">
                    </div>
                    <div style="flex-basis: 25%;">
                        <label for="adv-suc-cpf-${advSucumbencialCount}" style="font-weight: 600; color: var(--text-dark); display: block; margin-bottom: 5px;">CPF/CNPJ:</label>
                        <input type="text" id="adv-suc-cpf-${advSucumbencialCount}" maxlength="18" oninput="formatarDocumento(this, 'AMBOS'); atualizarQuadroResumo()" class="valor-input required-dynamic" style="width: 100%; text-align: left; background-color: white;">
                    </div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end; margin-top: 15px;">
                    <div style="flex: 0 0 135px;">
                        <label style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px; cursor: help;" title="Valor Líquido + IRRF">Honorários Bruto <i class="fas fa-info-circle" style="color: var(--primary-color); font-size: 0.85em;"></i>:</label>
                        <input type="text" id="adv-suc-resultado-${advSucumbencialCount}" class="valor-input required-dynamic" placeholder="0,00" title="Valor Líquido + IRRF" oninput="handleAdvSucResultadoManual(this, '${advSucumbencialCount}')" style="background-color: white; width: 100%; text-align: right; font-weight: bold; border: 1px solid #ccc; color: var(--text-dark); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                    </div>
                    <div style="flex: 1.5; min-width: 120px;">
                        <label for="adv-suc-ir-${advSucumbencialCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Retenção IRRF:</label>
                        <input type="text" id="adv-suc-ir-${advSucumbencialCount}" class="valor-input" placeholder="0,00" oninput="formatarMoeda(this); atualizarLiquidoSucumbencial('${advSucumbencialCount}'); sincronizarSucumbenciaisParaGeral(); atualizarQuadroResumo()" style="width: 100%; text-align: right; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                    </div>
                    <div style="flex: 1.5; min-width: 120px;">
                        <label for="adv-suc-retencao-${advSucumbencialCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Outras Retenções:</label>
                        <input type="text" id="adv-suc-retencao-${advSucumbencialCount}" class="valor-input" placeholder="0,00" oninput="formatarMoeda(this); atualizarLiquidoSucumbencial('${advSucumbencialCount}'); atualizarQuadroResumo()" style="width: 100%; text-align: right; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                    </div>
                    <div style="flex: 4; min-width: 200px;">
                        <label for="adv-suc-retencao-motivo-${advSucumbencialCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Motivo das Outras Retenções:</label>
                        <input type="text" id="adv-suc-retencao-motivo-${advSucumbencialCount}" class="valor-input" spellcheck="true" style="width: 100%; text-align: left; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);" oninput="formatarTextoMaiusculo(this); atualizarQuadroResumo()">
                    </div>
                </div>
                <div style="margin-top: 15px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                    <label style="font-weight: bold; font-size: 1.1em; color: var(--dark-accent);">Honorários Líquido a Liberar:</label>
                    <span id="adv-suc-liquido-${advSucumbencialCount}" class="valor-display-style" style="background-color: #e0f7fa; width: 200px; border-color: #008080; font-size: 1.1em; text-align: right;">0,00</span>
                </div>
            </div>
        </details>`;
    listDiv.insertAdjacentHTML('beforeend', newHTML);
    atualizarNumeracaoVisuais();
    sincronizarSucumbenciaisParaGeral();
    atualizarQuadroResumo();
}

function adicionarHerdeiro() {
    herdeiroCount++;

    document.querySelectorAll('.herdeiro-details').forEach(el => el.removeAttribute('open'));

    const listDiv = document.getElementById('herdeiros-list');

    const newHerHTML = `
        <details id="herdeiro-${herdeiroCount}" class="parte-adicional-block herdeiro-details" open>
            <summary style="display: flex; align-items: center; border-bottom: 1px solid var(--info-border); padding-bottom: 5px; margin-bottom: 10px; background: transparent; padding-top: 0; padding-left: 0; padding-right: 0;">
                <h4 style="margin: 0; border: none; padding: 0; color: var(--dark-accent); font-size: 1.05em;">Herdeiro ${herdeiroCount}</h4>
                <div class="actions-block" style="margin-left: auto;">
                    <button type="button" class="btn-delete-block no-print" onclick="confirmarExclusaoBloco('herdeiro-${herdeiroCount}', event)" title="Excluir"><i class="fas fa-times"></i></button>
                </div>
            </summary>
            <div style="padding-top: 5px;">
            <div style="display: flex; gap: 20px; align-items: flex-end; margin-bottom: 15px;">
                <div style="flex-basis: 75%;">
                    <label for="her-nome-${herdeiroCount}" style="font-weight: 600; color: var(--text-dark); display: block; margin-bottom: 5px;">Nome do Herdeiro (a):</label>
                    <input type="text" id="her-nome-${herdeiroCount}" oninput="formatarTextoMaiusculo(this); atualizarCredoresAdicionais()" spellcheck="true" class="valor-input required-dynamic" style="width: 100%; text-align: left; background-color: white;">
                </div>
                <div style="flex-basis: 25%;">
                    <label for="her-cpf-${herdeiroCount}" style="font-weight: 600; color: var(--text-dark); display: block; margin-bottom: 5px;">CPF:</label>
                    <input type="text" id="her-cpf-${herdeiroCount}" maxlength="14" oninput="formatarDocumento(this, 'CPF')" class="valor-input required-dynamic" style="width: 100%; text-align: left; background-color: white;">
                </div>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end; margin-top: 15px;">
                <div style="flex: 1.5; min-width: 100px;">
                    <label for="her-percentual-${herdeiroCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Rateio (%):</label>
                    <input type="text" id="her-percentual-${herdeiroCount}" class="valor-input required-dynamic" placeholder="0,00%" oninput="formatarPercentual(this); atualizarCredoresAdicionais();" style="width: 100%; text-align: right; border: 1px solid var(--primary-color); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 1.5; min-width: 140px;">
                    <label style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Valor da Herança:</label>
                    <input type="text" id="her-resultado-${herdeiroCount}" class="valor-input required-dynamic" placeholder="0,00" oninput="handleHerValorManual(this, '${herdeiroCount}')" style="background-color: white; width: 100%; text-align: right; font-weight: bold; border: 1px solid #ccc; color: var(--text-dark); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 1.5; min-width: 120px;">
                    <label for="her-retencao-${herdeiroCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Retenção:</label>
                    <input type="text" id="her-retencao-${herdeiroCount}" class="valor-input" placeholder="0,00" oninput="formatarMoeda(this); atualizarCredoresAdicionais()" style="width: 100%; text-align: right; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 5.5; min-width: 200px;">
                    <label for="her-retencao-motivo-${herdeiroCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Motivo da Retenção:</label>
                    <input type="text" id="her-retencao-motivo-${herdeiroCount}" class="valor-input" spellcheck="true" style="width: 100%; text-align: left; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);" oninput="formatarTextoMaiusculo(this); atualizarQuadroResumo()">
                </div>
            </div>

            <div id="her-adv-container-${herdeiroCount}" style="display: none;">
                <hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--info-border);">
                
                <div class="honorarios-section" style="padding: 15px; margin-bottom: 15px; border: 1px solid var(--info-border); border-radius: 6px; background-color: #f4f8f8;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--info-border); padding-bottom: 5px; margin-bottom: 15px;">
                        <h5 style="margin: 0; color: var(--dark-accent); font-size: 1.05em;">Cálculo de Honorários Advocatícios</h5>
                    </div>

                    <div id="her-adv-base-container-global-${herdeiroCount}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <label style="font-weight: bold; color: var(--dark-accent); font-size: 1.05em;">Base de Cálculo (R$):</label>
                        <span id="her-adv-base-global-${herdeiroCount}" class="valor-display-style" style="background-color: #e9ecef; width: 220px; text-align: right; font-size: 1.05em;">0,00</span>
                    </div>

                    <div id="her-adv-info-base-${herdeiroCount}" style="font-size: 0.85em; color: #555; margin-bottom: 15px; background-color: white; padding: 8px 12px; border-left: 4px solid var(--primary-color); border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); line-height: 1.4;">
                        <i class="fas fa-info-circle" style="color: var(--primary-color); margin-right: 5px;"></i> A Base de Cálculo é proporcional à cota do Herdeiro sobre a Base Global (LÍQUIDO + IRRF + INSS + HON. PERICIAIS).<br>
                        <span style="display: inline-block; margin-top: 4px; margin-left: 18px;">Caso a base de cálculo dos honorários divirja da regra acima, os valores deverão ser inseridos nos campos <strong>Valor Fixado</strong> e/ou <strong>Honorários Bruto</strong> (na seção de Adição dos Advogados).</span>
                    </div>

                    <div id="her-adv-options-container-${herdeiroCount}" style="margin-bottom: 15px;">
                        <div class="honorarios-options" style="margin-bottom: 0;">
                            <div class="honorarios-option">
                                <input type="radio" id="her-adv-opt-perc-${herdeiroCount}" name="her-adv-calculo-tipo-${herdeiroCount}" value="percentual" checked onchange="toggleHerAdvHonorariosFields(${herdeiroCount})">
                                <label for="her-adv-opt-perc-${herdeiroCount}">Percentual</label>
                            </div>
                            <div class="honorarios-option">
                                <input type="radio" id="her-adv-opt-fix-${herdeiroCount}" name="her-adv-calculo-tipo-${herdeiroCount}" value="fixado" onchange="toggleHerAdvHonorariosFields(${herdeiroCount})">
                                <label for="her-adv-opt-fix-${herdeiroCount}">Valor Fixado</label>
                            </div>
                        </div>
                    </div>
                    <div id="her-adv-perc-fields-global-${herdeiroCount}" class="honorarios-fields">
                        <div class="field-group">
                            <label for="her-adv-perc-global-${herdeiroCount}">Percentual (%):</label>
                            <input type="text" id="her-adv-perc-global-${herdeiroCount}" placeholder="0,00%" oninput="formatarPercentual(this); atualizarCredoresAdicionais();" style="width: 120px;">
                        </div>
                        <div class="field-group">
                            <label title="Valor Líquido + IRRF" style="cursor: help;">Honorários Bruto <i class="fas fa-info-circle" style="color: var(--primary-color); font-size: 0.85em;"></i>:</label>
                            <span id="her-adv-resultado-global-${herdeiroCount}" title="Valor Líquido + IRRF" style="width: 135px; flex-shrink: 0; padding: 10px; border: 1px solid #ccc; border-radius: 4px; text-align: right; box-sizing: border-box; background-color: white; display: block; font-weight: normal; color: var(--text-dark);">0,00</span>
                        </div>
                    </div>
                    <div id="her-adv-fix-fields-global-${herdeiroCount}" class="honorarios-fields" style="display: none;">
                        <div class="field-group">
                            <label for="her-adv-fix-global-${herdeiroCount}" title="Valor Líquido + IRRF" style="cursor: help;">Honorários Bruto <i class="fas fa-info-circle" style="color: var(--primary-color); font-size: 0.85em;"></i>:</label>
                            <input type="text" id="her-adv-fix-global-${herdeiroCount}" placeholder="0,00" title="Valor Líquido + IRRF" oninput="formatarMoeda(this); atualizarCredoresAdicionais();" style="width: 135px;">
                        </div>
                    </div>
                </div>

                <div id="her-adv-list-${herdeiroCount}"></div>
                <button type="button" class="add-adv-esp-btn" onclick="adicionarAdvogadoHerdeiro(${herdeiroCount})">+ Adicionar Advogado (a)</button>
            </div>
            <button type="button" id="btn-add-adv-esp-her-${herdeiroCount}" class="add-adv-esp-btn" onclick="iniciarAdvogadoHerdeiro(${herdeiroCount})">+ Adicionar Advogado (a) Específico (a)</button>

            <div style="margin-top: 15px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                <label style="font-weight: bold; font-size: 1.1em; color: var(--dark-accent);">Líquido a Liberar (Herdeiro): </label>
                                       <span id="her-liquido-${herdeiroCount}" class="valor-display-style" style="background-color: #e0f7fa; width: 200px; border-color: #008080; font-size: 1.1em; text-align: right;">0,00</span>
            </div>
            </div>
        </details>`;
    listDiv.insertAdjacentHTML('beforeend', newHerHTML);
    atualizarNumeracaoVisuais();
    atualizarCredoresAdicionais();
    verificarTravasAdvogadosEspecificos();
}

function adicionarCessionario() {
    cessionarioCount++;

    document.querySelectorAll('.cessionario-details').forEach(el => el.removeAttribute('open'));

    const listDiv = document.getElementById('cessionarios-list');

    const newCesHTML = `
        <details id="cessionario-${cessionarioCount}" class="parte-adicional-block cessionario-details" open>
            <summary style="display: flex; align-items: center; border-bottom: 1px solid var(--info-border); padding-bottom: 5px; margin-bottom: 10px; background: transparent; padding-top: 0; padding-left: 0; padding-right: 0;">
                <h4 style="margin: 0; border: none; padding: 0; color: var(--dark-accent); font-size: 1.05em;">Cessionário ${cessionarioCount}</h4>
                <div class="actions-block" style="margin-left: auto;">
                    <button type="button" class="btn-delete-block no-print" onclick="confirmarExclusaoBloco('cessionario-${cessionarioCount}', event)" title="Excluir"><i class="fas fa-times"></i></button>
                </div>
            </summary>
            <div style="padding-top: 5px;">
            <div style="display: flex; gap: 20px; align-items: flex-end; margin-bottom: 15px;">
                <div style="flex-basis: 75%;">
                    <label for="ces-nome-${cessionarioCount}" style="font-weight: 600; color: var(--text-dark); display: block; margin-bottom: 5px;">Nome do Cessionário:</label>
                    <input type="text" id="ces-nome-${cessionarioCount}" oninput="formatarTextoMaiusculo(this); atualizarCredoresAdicionais()" spellcheck="true" class="valor-input required-dynamic" style="width: 100%; text-align: left; background-color: white;">
                </div>
                <div style="flex-basis: 25%;">
                    <label for="ces-cpf-${cessionarioCount}" style="font-weight: 600; color: var(--text-dark); display: block; margin-bottom: 5px;">CPF/CNPJ:</label>
                    <input type="text" id="ces-cpf-${cessionarioCount}" maxlength="18" oninput="formatarDocumento(this, 'AMBOS')" class="valor-input required-dynamic" style="width: 100%; text-align: left; background-color: white;">
                </div>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end; margin-top: 15px;">
                <div style="flex: 1.5; min-width: 100px;">
                    <label for="ces-percentual-${cessionarioCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Rateio (%):</label>
                    <input type="text" id="ces-percentual-${cessionarioCount}" class="valor-input required-dynamic" placeholder="0,00%" oninput="formatarPercentual(this); atualizarCredoresAdicionais();" style="width: 100%; text-align: right; border: 1px solid var(--primary-color); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 1.5; min-width: 140px;">
                    <label style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Valor da Cessão:</label>
                    <input type="text" id="ces-resultado-${cessionarioCount}" class="valor-input required-dynamic" placeholder="0,00" oninput="handleCesValorManual(this, '${cessionarioCount}')" style="background-color: white; width: 100%; text-align: right; font-weight: bold; border: 1px solid #ccc; color: var(--text-dark); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 1.5; min-width: 120px;">
                    <label for="ces-retencao-${cessionarioCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Retenção: </label>
                    <input type="text" id="ces-retencao-${cessionarioCount}" class="valor-input" placeholder="0,00" oninput="formatarMoeda(this); atualizarCredoresAdicionais()" style="width: 100%; text-align: right; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 5.5; min-width: 200px;">
                    <label for="ces-retencao-motivo-${cessionarioCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Motivo da Retenção:</label>
                    <input type="text" id="ces-retencao-motivo-${cessionarioCount}" class="valor-input" spellcheck="true" style="width: 100%; text-align: left; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);" oninput="formatarTextoMaiusculo(this); atualizarQuadroResumo()">
                </div>
            </div>

            <div id="ces-adv-container-${cessionarioCount}" style="display: none;">
                <hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--info-border);">

                <div class="honorarios-section" style="padding: 15px; margin-bottom: 15px; border: 1px solid var(--info-border); border-radius: 6px; background-color: #f4f8f8;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--info-border); padding-bottom: 5px; margin-bottom: 15px;">
                        <h5 style="margin: 0; color: var(--dark-accent); font-size: 1.05em;">Cálculo de Honorários Advocatícios</h5>
                    </div>

                    <div id="ces-adv-base-container-global-${cessionarioCount}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <label style="font-weight: bold; color: var(--dark-accent); font-size: 1.05em;">Base de Cálculo (R$):</label>
                        <span id="ces-adv-base-global-${cessionarioCount}" class="valor-display-style" style="background-color: #e9ecef; width: 220px; text-align: right; font-size: 1.05em;">0,00</span>
                    </div>

                    <div id="ces-adv-info-base-${cessionarioCount}" style="font-size: 0.85em; color: #555; margin-bottom: 15px; background-color: white; padding: 8px 12px; border-left: 4px solid var(--primary-color); border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); line-height: 1.4;">
                        <i class="fas fa-info-circle" style="color: var(--primary-color); margin-right: 5px;"></i> A Base de Cálculo é proporcional à cota do Cessionário sobre a Base Global (LÍQUIDO + IRRF + INSS + HON. PERICIAIS).<br>
                        <span style="display: inline-block; margin-top: 4px; margin-left: 18px;">Caso a base de cálculo dos honorários divirja da regra acima, os valores deverão ser inseridos nos campos <strong>Valor Fixado</strong> e/ou <strong>Honorários Bruto</strong> (na seção de Adição dos Advogados).</span>
                    </div>

                    <div id="ces-adv-options-container-${cessionarioCount}" style="margin-bottom: 15px;">
                        <div class="honorarios-options" style="margin-bottom: 0;">
                            <div class="honorarios-option">
                                <input type="radio" id="ces-adv-opt-perc-${cessionarioCount}" name="ces-adv-calculo-tipo-${cessionarioCount}" value="percentual" checked onchange="toggleCesAdvHonorariosFields(${cessionarioCount})">
                                <label for="ces-adv-opt-perc-${cessionarioCount}">Percentual</label>
                            </div>
                            <div class="honorarios-option">
                                <input type="radio" id="ces-adv-opt-fix-${cessionarioCount}" name="ces-adv-calculo-tipo-${cessionarioCount}" value="fixado" onchange="toggleCesAdvHonorariosFields(${cessionarioCount})">
                                <label for="ces-adv-opt-fix-${cessionarioCount}">Valor Fixado</label>
                            </div>
                        </div>
                    </div>
                    <div id="ces-adv-perc-fields-global-${cessionarioCount}" class="honorarios-fields">
                        <div class="field-group">
                            <label for="ces-adv-perc-global-${cessionarioCount}">Percentual (%):</label>
                            <input type="text" id="ces-adv-perc-global-${cessionarioCount}" placeholder="0,00%" oninput="formatarPercentual(this); atualizarCredoresAdicionais();" style="width: 120px;">
                        </div>
                        <div class="field-group">
                            <label title="Valor Líquido + IRRF" style="cursor: help;">Honorários Bruto <i class="fas fa-info-circle" style="color: var(--primary-color); font-size: 0.85em;"></i>:</label>
                            <span id="ces-adv-resultado-global-${cessionarioCount}" title="Valor Líquido + IRRF" style="width: 135px; flex-shrink: 0; padding: 10px; border: 1px solid #ccc; border-radius: 4px; text-align: right; box-sizing: border-box; background-color: white; display: block; font-weight: normal; color: var(--text-dark);">0,00</span>
                        </div>
                    </div>
                    <div id="ces-adv-fix-fields-global-${cessionarioCount}" class="honorarios-fields" style="display: none;">
                        <div class="field-group">
                            <label for="ces-adv-fix-global-${cessionarioCount}" title="Valor Líquido + IRRF" style="cursor: help;">Honorários Bruto <i class="fas fa-info-circle" style="color: var(--primary-color); font-size: 0.85em;"></i>:</label>
                            <input type="text" id="ces-adv-fix-global-${cessionarioCount}" placeholder="0,00" title="Valor Líquido + IRRF" oninput="formatarMoeda(this); atualizarCredoresAdicionais();" style="width: 135px;">
                        </div>
                    </div>
                </div>

                <div id="ces-adv-list-${cessionarioCount}"></div>
                <button type="button" class="add-adv-esp-btn" onclick="adicionarAdvogadoCessionario(${cessionarioCount})">+ Adicionar Advogado (a)</button>
            </div>
            <button type="button" id="btn-add-adv-esp-ces-${cessionarioCount}" class="add-adv-esp-btn" onclick="iniciarAdvogadoCessionario(${cessionarioCount})">+ Adicionar Advogado (a) Específico (a)</button>

            <div style="margin-top: 15px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                <label style="font-weight: bold; font-size: 1.1em; color: var(--dark-accent);">Líquido a Liberar (Cessionário):</label>
                <span id="ces-liquido-${cessionarioCount}" class="valor-display-style" style="background-color: #e0f7fa; width: 200px; border-color: #008080; font-size: 1.1em; text-align: right;">0,00</span>
            </div>
            </div>
        </details>`;
    listDiv.insertAdjacentHTML('beforeend', newCesHTML);
    atualizarNumeracaoVisuais();
    atualizarCredoresAdicionais();
    verificarTravasAdvogadosEspecificos();
}

function adicionarAdvogadoHerdeiro(herdeiroId) {
    advHerdeiroCount++;

    document.querySelectorAll(`.adv-herdeiro-${herdeiroId}`).forEach(el => {
        if (el.tagName === 'DETAILS') el.removeAttribute('open');
    });

    const listDiv = document.getElementById(`her-adv-list-${herdeiroId}`);
    const nextAdvIndex = listDiv.children.length + 1;
    const html = `
        <details id="her-adv-block-${advHerdeiroCount}" class="adv-herdeiro-${herdeiroId}" data-adv-id="${advHerdeiroCount}" style="border: 1px solid var(--info-border); padding: 15px; margin-top: 15px; border-radius: 6px; background-color: #f4f8f8;" open>
            <summary style="display: flex; align-items: center; border-bottom: 1px solid var(--info-border); padding-bottom: 5px; margin-bottom: 15px; background: transparent; padding-top: 0; padding-left: 0; padding-right: 0;">
                <h5 style="margin: 0; color: var(--dark-accent); font-size: 1em;">Advogado (a) ${nextAdvIndex} (Herdeiro ${herdeiroId})</h5>
                <div class="actions-block" style="margin-left: auto;">
                    <button type="button" class="btn-delete-block no-print" onclick="confirmarExclusaoBloco('her-adv-block-${advHerdeiroCount}', event)" title="Excluir"><i class="fas fa-times"></i></button>
                </div>
            </summary>
            <div style="padding-top: 5px;">
            <div style="display: flex; gap: 20px; align-items: flex-end; margin-bottom: 15px;">
                <div style="flex-basis: 75%;">
                    <label for="her-adv-nome-${advHerdeiroCount}" style="display: block; margin-bottom: 5px;">Nome do Advogado(a):</label>
                    <input type="text" id="her-adv-nome-${advHerdeiroCount}" spellcheck="true" class="valor-input required-dynamic" style="width: 100%; text-align: left; background-color: white;" oninput="formatarTextoMaiusculo(this); atualizarQuadroResumo()">
                </div>
                <div style="flex-basis: 25%;">
                    <label for="her-adv-cpf-${advHerdeiroCount}" style="display: block; margin-bottom: 5px;">CPF/CNPJ:</label>
                    <input type="text" id="her-adv-cpf-${advHerdeiroCount}" maxlength="18" oninput="formatarDocumento(this, 'AMBOS'); atualizarQuadroResumo()" class="valor-input required-dynamic" style="width: 100%; text-align: left; background-color: white;">
                </div>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end; margin-top: 15px;">
                <div style="flex: 1.5; min-width: 100px;">
                    <label for="her-adv-part-${advHerdeiroCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Rateio (%):</label>
                    <input type="text" id="her-adv-part-${advHerdeiroCount}" class="valor-input required-dynamic" placeholder="0,00%" oninput="formatarPercentual(this); atualizarCredoresAdicionais();" style="width: 100%; text-align: right; border: 1px solid var(--primary-color); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 0 0 135px;">
                    <label style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px; cursor: help;" title="Valor Líquido + IRRF">Honorários Bruto <i class="fas fa-info-circle" style="color: var(--primary-color); font-size: 0.85em;"></i>:</label>
                    <input type="text" id="her-adv-resultado-${advHerdeiroCount}" class="valor-input" placeholder="0,00" title="Valor Líquido + IRRF" oninput="handleHerAdvHonorarioManual(this, '${advHerdeiroCount}', '${herdeiroId}')" style="background-color: white; width: 100%; text-align: right; font-weight: bold; border: 1px solid #ccc; color: var(--text-dark); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 1.5; min-width: 120px;">
                    <label for="her-adv-ir-${advHerdeiroCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Retenção IRRF:</label>
                    <input type="text" id="her-adv-ir-${advHerdeiroCount}" class="valor-input" placeholder="0,00" oninput="formatarMoeda(this); atualizarCredoresAdicionais();" style="width: 100%; text-align: right; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 1.5; min-width: 120px;">
                    <label for="her-adv-ret-${advHerdeiroCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Outras Retenções:</label>
                    <input type="text" id="her-adv-ret-${advHerdeiroCount}" class="valor-input" placeholder="0,00" oninput="formatarMoeda(this); atualizarCredoresAdicionais();" style="width: 100%; text-align: right; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 4; min-width: 200px;">
                    <label for="her-adv-ret-motivo-${advHerdeiroCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Motivo das Outras Retenções:</label>
                    <input type="text" id="her-adv-ret-motivo-${advHerdeiroCount}" class="valor-input" spellcheck="true" style="width: 100%; text-align: left; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);" oninput="formatarTextoMaiusculo(this); atualizarQuadroResumo()">
                </div>
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: flex-end; align-items: center; border-top: 1px solid #ddd; padding-top: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <label style="font-weight: bold; font-size: 1em; color: var(--dark-accent);">Honorários Líquido a Liberar:</label>
                    <span id="her-adv-liquido-${advHerdeiroCount}" class="valor-display-style" style="background-color: #e0f7fa; width: 180px; border-color: #008080; font-size: 1.1em; text-align: right;">0,00</span>
                </div>
            </div>
            </div>
        </details>
    `;
    listDiv.insertAdjacentHTML('beforeend', html);
    atualizarNumeracaoVisuais();
    atualizarCredoresAdicionais();
}

function adicionarAdvogadoCessionario(cessionarioId) {
    advCessionarioCount++;

    document.querySelectorAll(`.adv-cessionario-${cessionarioId}`).forEach(el => {
        if (el.tagName === 'DETAILS') el.removeAttribute('open');
    });

    const listDiv = document.getElementById(`ces-adv-list-${cessionarioId}`);
    const nextAdvIndex = listDiv.children.length + 1;
    const html = `
        <details id="ces-adv-block-${advCessionarioCount}" class="adv-cessionario-${cessionarioId}" data-adv-id="${advCessionarioCount}" style="border: 1px solid var(--info-border); padding: 15px; margin-top: 15px; border-radius: 6px; background-color: #f4f8f8;" open>
            <summary style="display: flex; align-items: center; border-bottom: 1px solid var(--info-border); padding-bottom: 5px; margin-bottom: 15px; background: transparent; padding-top: 0; padding-left: 0; padding-right: 0;">
                <h5 style="margin: 0; color: var(--dark-accent); font-size: 1em;">Advogado (a) ${nextAdvIndex} (Cessionário ${cessionarioId})</h5>
                <div class="actions-block" style="margin-left: auto;">
                    <button type="button" class="btn-delete-block no-print" onclick="confirmarExclusaoBloco('ces-adv-block-${advCessionarioCount}', event)" title="Excluir"><i class="fas fa-times"></i></button>
                </div>
            </summary>
            <div style="padding-top: 5px;">
            <div style="display: flex; gap: 20px; align-items: flex-end; margin-bottom: 15px;">
                <div style="flex-basis: 75%;">
                    <label for="ces-adv-nome-${advCessionarioCount}" style="display: block; margin-bottom: 5px;">Nome do Advogado(a):</label>
                    <input type="text" id="ces-adv-nome-${advCessionarioCount}" spellcheck="true" class="valor-input required-dynamic" style="width: 100%; text-align: left; background-color: white;" oninput="formatarTextoMaiusculo(this); atualizarQuadroResumo()">
                </div>
                <div style="flex-basis: 25%;">
                    <label for="ces-adv-cpf-${advCessionarioCount}" style="display: block; margin-bottom: 5px;">CPF/CNPJ:</label>
                    <input type="text" id="ces-adv-cpf-${advCessionarioCount}" maxlength="18" oninput="formatarDocumento(this, 'AMBOS'); atualizarQuadroResumo()" class="valor-input required-dynamic" style="width: 100%; text-align: left; background-color: white;">
                </div>
            </div>
            
            <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end; margin-top: 15px;">
                <div style="flex: 1.5; min-width: 100px;">
                    <label for="ces-adv-part-${advCessionarioCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Rateio (%):</label>
                    <input type="text" id="ces-adv-part-${advCessionarioCount}" class="valor-input required-dynamic" placeholder="0,00%" oninput="formatarPercentual(this); atualizarCredoresAdicionais();" style="width: 100%; text-align: right; border: 1px solid var(--primary-color); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 0 0 135px;">
                    <label style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px; cursor: help;" title="Valor Líquido + IRRF">Honorários Bruto <i class="fas fa-info-circle" style="color: var(--primary-color); font-size: 0.85em;"></i>:</label>
                    <input type="text" id="ces-adv-resultado-${advCessionarioCount}" class="valor-input" placeholder="0,00" title="Valor Líquido + IRRF" oninput="handleCesAdvHonorarioManual(this, '${advCessionarioCount}', '${cessionarioId}')" style="background-color: white; width: 100%; text-align: right; font-weight: bold; border: 1px solid #ccc; color: var(--text-dark); box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 1.5; min-width: 120px;">
                    <label for="ces-adv-ir-${advCessionarioCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Retenção IRRF:</label>
                    <input type="text" id="ces-adv-ir-${advCessionarioCount}" class="valor-input" placeholder="0,00" oninput="formatarMoeda(this); atualizarCredoresAdicionais();" style="width: 100%; text-align: right; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 1.5; min-width: 120px;">
                    <label for="ces-adv-ret-${advCessionarioCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Outras Retenções:</label>
                    <input type="text" id="ces-adv-ret-${advCessionarioCount}" class="valor-input" placeholder="0,00" oninput="formatarMoeda(this); atualizarCredoresAdicionais();" style="width: 100%; text-align: right; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                </div>
                <div style="flex: 4; min-width: 200px;">
                    <label for="ces-adv-ret-motivo-${advCessionarioCount}" style="font-weight: 600; font-size: 0.9em; color: var(--text-dark); display: block; margin-bottom: 5px;">Motivo das Outras Retenções:</label>
                    <input type="text" id="ces-adv-ret-motivo-${advCessionarioCount}" class="valor-input" spellcheck="true" style="width: 100%; text-align: left; border: 1px solid #ccc; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);" oninput="formatarTextoMaiusculo(this); atualizarQuadroResumo()">
                </div>
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: flex-end; align-items: center; border-top: 1px solid #ddd; padding-top: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <label style="font-weight: bold; font-size: 1em; color: var(--dark-accent);">Honorários Líquido a Liberar:</label>
                    <span id="ces-adv-liquido-${advCessionarioCount}" class="valor-display-style" style="background-color: #e0f7fa; width: 180px; border-color: #008080; font-size: 1.1em; text-align: right;">0,00</span>
                </div>
            </div>
            </div>
        </details>
    `;
    listDiv.insertAdjacentHTML('beforeend', html);
    atualizarNumeracaoVisuais();
    atualizarCredoresAdicionais();
}

function removerAdvogadoHerdeiro(advId, herdeiroId) {
    removerParte(`her-adv-block-${advId}`);
    const listDiv = document.getElementById(`her-adv-list-${herdeiroId}`);
    if (listDiv && listDiv.children.length === 0) {
        document.getElementById(`her-adv-container-${herdeiroId}`).style.display = 'none';
        document.getElementById(`btn-add-adv-esp-her-${herdeiroId}`).style.display = 'inline-block';
        document.getElementById(`her-adv-opt-perc-${herdeiroId}`).checked = true;
        document.getElementById(`her-adv-perc-global-${herdeiroId}`).value = '';
        document.getElementById(`her-adv-fix-global-${herdeiroId}`).value = '';
        document.getElementById(`her-adv-base-global-${herdeiroId}`).textContent = '0,00';
        document.getElementById(`her-adv-resultado-global-${herdeiroId}`).textContent = '0,00';
        toggleHerAdvHonorariosFields(herdeiroId);
    }
}

function removerAdvogadoCessionario(advId, cessionarioId) {
    removerParte(`ces-adv-block-${advId}`);
    const listDiv = document.getElementById(`ces-adv-list-${cessionarioId}`);
    if (listDiv && listDiv.children.length === 0) {
        document.getElementById(`ces-adv-container-${cessionarioId}`).style.display = 'none';
        document.getElementById(`btn-add-adv-esp-ces-${cessionarioId}`).style.display = 'inline-block';
        document.getElementById(`ces-adv-opt-perc-${cessionarioId}`).checked = true;
        document.getElementById(`ces-adv-perc-global-${cessionarioId}`).value = '';
        document.getElementById(`ces-adv-fix-global-${cessionarioId}`).value = '';
        document.getElementById(`ces-adv-base-global-${cessionarioId}`).textContent = '0,00';
        document.getElementById(`ces-adv-resultado-global-${cessionarioId}`).textContent = '0,00';
        toggleCesAdvHonorariosFields(cessionarioId);
    }
}

function removerParte(id, force = false) {
    const elemento = document.getElementById(id);
    if (elemento) {
        if (!force && (id.includes('adv-adicional-') || id.includes('adv-sucumbencial-') || id.includes('perito-adicional-'))) {
            const resInputs = elemento.querySelectorAll('input[id*="-resultado"]');
            let isProtected = false;
            resInputs.forEach(input => {
                if (input.readOnly) isProtected = true;
            });
            if (isProtected) {
                showCustomAlert("Qualquer alteração deve ser feita diretamente no lançamentos de honorários nas informações oriundas da planilha de atualização de cálculos.");
                return false;
            }
        }

        elemento.remove();
        atualizarNumeracaoVisuais();
        if (id.startsWith('adv-adicional-')) {
            sincronizarAdvogadosParaGeral();
        } else if (id.startsWith('adv-sucumbencial-')) {
            sincronizarSucumbenciaisParaGeral();
        }
        atualizarCredoresAdicionais();
        atualizarSomaLiquido();
        return true;
    }
    return false;
}

function removerAdvogadoPrincipal(force = false) {
    if (!limparBloco('adv-principal-block', force)) return false;
    const percPrinc = document.getElementById('adv-principal-percentual');
    if (percPrinc) percPrinc.value = '';

    const block = document.getElementById('adv-principal-block');
    if (block) block.style.display = 'none';
    sincronizarAdvogadosParaGeral();
    atualizarCredoresAdicionais();
    atualizarSomaLiquido();
    return true;
}

function removerPeritoPrincipal(force = false) {
    if (!limparBloco('perito-principal-block', force)) return false;
    const block = document.getElementById('perito-principal-block');
    if (block) block.style.display = 'none';
    sincronizarPeritosParaPrincipal();
    atualizarQuadroResumo();
    return true;
}

// =======================================================================
// SINCRONIZAÇÃO E HANDLERS DE INPUTS MANUAIS
// =======================================================================

function atualizarLiquidoAdvogado(suffix) {
    let grossId, irId, retId, netId;
    if (suffix === 'principal') {
        grossId = 'adv-principal-resultado';
        irId = 'adv-principal-ir';
        retId = 'adv-principal-retencao';
        netId = 'adv-principal-liquido';
    } else {
        grossId = `adv-ad-resultado-${suffix}`;
        irId = `adv-ad-ir-${suffix}`;
        retId = `adv-ad-retencao-${suffix}`;
        netId = `adv-ad-liquido-${suffix}`;
    }

    const grossVal = getNumericValue(grossId);
    const irVal = getNumericValue(irId);
    const retVal = getNumericValue(retId);
    const netVal = Math.max(0, grossVal - irVal - retVal);

    const netEl = document.getElementById(netId);
    if (netEl) {
        netEl.textContent = formatarMoedaParaExibicao(netVal);
    }
}

function atualizarLiquidoSucumbencial(suffix) {
    const grossVal = getNumericValue(`adv-suc-resultado-${suffix}`);
    const irVal = getNumericValue(`adv-suc-ir-${suffix}`);
    const retVal = getNumericValue(`adv-suc-retencao-${suffix}`);
    const netVal = Math.max(0, grossVal - irVal - retVal);
    const netEl = document.getElementById(`adv-suc-liquido-${suffix}`);
    if (netEl) {
        netEl.textContent = formatarMoedaParaExibicao(netVal);
    }
}

function atualizarLiquidoPerito(suffix) {
    let grossId, irId, retId, netId;
    if (suffix === 'principal') {
        grossId = 'perito-principal-resultado';
        irId = 'perito-principal-ir';
        retId = 'perito-principal-retencao';
        netId = 'perito-principal-liquido';
    } else {
        grossId = `perito-ad-resultado-${suffix}`;
        irId = `perito-ad-ir-${suffix}`;
        retId = `perito-ad-retencao-${suffix}`;
        netId = `perito-ad-liquido-${suffix}`;
    }
    const grossVal = getNumericValue(grossId);
    const irVal = getNumericValue(irId);
    const retVal = getNumericValue(retId);
    const netVal = Math.max(0, grossVal - irVal - retVal);
    const netEl = document.getElementById(netId);
    if (netEl) {
        if (netEl.tagName === 'INPUT') netEl.value = formatarMoedaParaExibicao(netVal);
        else netEl.textContent = formatarMoedaParaExibicao(netVal);
    }
}

function handleAdvHonorarioManual(input, id) {
    formatarMoeda(input);
    const percInput = document.getElementById(id === 'principal' ? 'adv-principal-percentual' : `adv-ad-percentual-${id}`);
    if (percInput) percInput.value = '';
    const advValorFixado = document.getElementById('adv-valor-fixado');
    if (advValorFixado) advValorFixado.dataset.origem = 'manual';
    atualizarLiquidoAdvogado(id);
    sincronizarAdvogadosParaGeral();
    atualizarQuadroResumo();
}

function handleAdvSucResultadoManual(input, id) {
    formatarMoeda(input);
    atualizarLiquidoSucumbencial(id);
    sincronizarSucumbenciaisParaGeral();
    atualizarQuadroResumo();
}

function handleHerAdvHonorarioManual(input, advId, herdeiroId) {
    formatarMoeda(input);
    const percInput = document.getElementById(`her-adv-part-${advId}`);
    if (percInput) percInput.value = '';
    atualizarCredoresAdicionais();
}

function handleCesAdvHonorarioManual(input, advId, cessionarioId) {
    formatarMoeda(input);
    const percInput = document.getElementById(`ces-adv-part-${advId}`);
    if (percInput) percInput.value = '';
    atualizarCredoresAdicionais();
}

function handleHerValorManual(input, id) {
    formatarMoeda(input);
    const percInput = document.getElementById(`her-percentual-${id}`);
    if (percInput) percInput.value = '';
    atualizarCredoresAdicionais();
}

function handleCesValorManual(input, id) {
    formatarMoeda(input);
    const percInput = document.getElementById(`ces-percentual-${id}`);
    if (percInput) percInput.value = '';
    atualizarCredoresAdicionais();
}

function atualizarCustasSimultaneo(input) {
    formatarMoeda(input);
    atualizarSomaLiquido();
}

function sincronizarSucumbenciaisParaGeral() {
    atualizarPlanilhaHonorariosAdvocaticios();
    atualizarSomaLiquido();
    verificarTravasHonorarios();
}

function sincronizarAdvogadosParaGeral() {
    let totalHonModal = 0;
    let totalIrrfModal = 0;
    let hasModalBlock = false;

    const calcBlock = (suffix) => {
        const resEl = document.getElementById(suffix === 'principal' ? 'adv-principal-resultado' : `adv-ad-resultado-${suffix}`);
        const irEl = document.getElementById(suffix === 'principal' ? 'adv-principal-ir' : `adv-ad-ir-${suffix}`);
        if (resEl && resEl.readOnly) {
            hasModalBlock = true;
            const hon = getNumericValueFromInput(resEl);
            const ir = getNumericValueFromInput(irEl);
            totalHonModal += hon;
            totalIrrfModal += ir;
        }
    };

    calcBlock('principal');
    for (let i = 1; i <= advogadoAdicionalCount; i++) {
        calcBlock(i);
    }

    const advValorFixado = document.getElementById('adv-valor-fixado');

    if (hasModalBlock || (advValorFixado && advValorFixado.dataset.origem === 'modal')) {
        const btnFixado = document.getElementById('adv-valor-fixado-opt');
        if (btnFixado && !btnFixado.checked) {
            btnFixado.checked = true;
            toggleAdvHonorariosFields();
        }

        if (advValorFixado) {
            if (totalHonModal === 0 && totalIrrfModal === 0) {
                advValorFixado.value = '';
                advValorFixado.dataset.origem = '';
            } else {
                advValorFixado.value = formatarMoedaParaExibicao(totalHonModal);
                advValorFixado.dataset.origem = 'modal';
            }
        }
        calcularHonorarios('adv');
    }
    
    atualizarPlanilhaHonorariosAdvocaticios();
    atualizarSomaLiquido();
    verificarTravasHonorarios();
}

function sincronizarFixadoParaPlanilha() {
    atualizarQuadroResumo();
}

function sincronizarPeritosParaPrincipal() {
    let totalHonBruto = 0;
    let totalIrrf = 0;
    let totalHonModal = 0;
    let totalIrrfModal = 0;

    const calcBlock = (suffix) => {
        const resEl = document.getElementById(suffix === 'principal' ? 'perito-principal-resultado' : `perito-ad-resultado-${suffix}`);
        const irEl = document.getElementById(suffix === 'principal' ? 'perito-principal-ir' : `perito-ad-ir-${suffix}`);
        if (resEl) {
            const hon = getNumericValueFromInput(resEl);
            const ir = getNumericValueFromInput(irEl);
            totalHonBruto += hon;
            totalIrrf += ir;
            if (resEl.readOnly) {
                totalHonModal += hon;
                totalIrrfModal += ir;
            }
        }
    };

    calcBlock('principal');
    for (let i = 1; i <= peritoAdicionalCount; i++) {
        calcBlock(i);
    }

    const planHon = document.getElementById('input-honorarios-periciais');
    const planIrrf = document.getElementById('input-irrf-periciais');
    
    if (peritoAdicionalCount > 0 || totalHonModal > 0 || totalIrrfModal > 0 || (planHon && planHon.dataset.fromModal === 'true')) {
        const liquidoModalParaPlanilha = Math.max(0, totalHonModal - totalIrrfModal);
        if (planHon) { planHon.value = liquidoModalParaPlanilha > 0 ? formatarMoedaParaExibicao(liquidoModalParaPlanilha) : ''; planHon.dataset.fromModal = 'true'; }
        if (planIrrf) { planIrrf.value = totalIrrfModal > 0 ? formatarMoedaParaExibicao(totalIrrfModal) : ''; planIrrf.dataset.fromModal = 'true'; }
    }
    atualizarSomaLiquido();
}

function atualizarPlanilhaHonorariosAdvocaticios() {
    let totalHonModal = 0;
    let totalIrrfModal = 0;
    let totalSucHonModal = 0;
    let totalSucIrrfModal = 0;

    const calcBlockAdv = (suffix) => {
        const resEl = document.getElementById(suffix === 'principal' ? 'adv-principal-resultado' : `adv-ad-resultado-${suffix}`);
        const irEl = document.getElementById(suffix === 'principal' ? 'adv-principal-ir' : `adv-ad-ir-${suffix}`);
        if (resEl && resEl.readOnly) {
            totalHonModal += getNumericValueFromInput(resEl);
            totalIrrfModal += getNumericValueFromInput(irEl);
        }
    };
    calcBlockAdv('principal');
    for (let i = 1; i <= advogadoAdicionalCount; i++) {
        calcBlockAdv(i);
    }

    for (let i = 1; i <= advSucumbencialCount; i++) {
        const resEl = document.getElementById(`adv-suc-resultado-${i}`);
        const irEl = document.getElementById(`adv-suc-ir-${i}`);
        if (resEl) {
            totalSucHonModal += getNumericValueFromInput(resEl);
            totalSucIrrfModal += getNumericValueFromInput(irEl);
        }
    }

    const planHon = document.getElementById('input-honorarios-advocaticios');
    const planIrrf = document.getElementById('input-irrf-honorarios');

    let currentAbaHonNet = Math.max(0, totalHonModal - totalIrrfModal) + Math.max(0, totalSucHonModal - totalSucIrrfModal);
    let currentAbaIrrfTotal = totalIrrfModal + totalSucIrrfModal;

    if (planHon) {
        let planHonVal = getNumericValue('input-honorarios-advocaticios');
        let planIrrfVal = planIrrf ? getNumericValue('input-irrf-honorarios') : 0;
        
        let manualHonNet = Math.max(0, planHonVal - (window.lastAbaAdvHonNet || 0));
        let manualIrrf = Math.max(0, planIrrfVal - (window.lastAbaAdvIrrfTotal || 0));
        
        if (planHon.value.trim() === '' || planHon.value.trim() === '0,00') manualHonNet = 0;
        if (planIrrf && (planIrrf.value.trim() === '' || planIrrf.value.trim() === '0,00')) manualIrrf = 0;

        let newPlanHonNet = manualHonNet + currentAbaHonNet;
        let newPlanIrrf = manualIrrf + currentAbaIrrfTotal;

        planHon.value = newPlanHonNet > 0 ? formatarMoedaParaExibicao(newPlanHonNet) : '';
        if (planIrrf) planIrrf.value = newPlanIrrf > 0 ? formatarMoedaParaExibicao(newPlanIrrf) : '';
        
        planHon.dataset.fromModal = currentAbaHonNet > 0 ? 'true' : 'false';
    }
    
    window.lastAbaAdvHonNet = currentAbaHonNet;
    window.lastAbaAdvIrrfTotal = currentAbaIrrfTotal;
}

// =======================================================================
// LÓGICA DE MODAIS
// =======================================================================

function setBlockReadonly(prefix, targetSuffix, isReadonly) {
    const bg = isReadonly ? '#e9ecef' : 'white';
    const bgEditable = 'white';
    const alertMsg = "Qualquer alteração deve ser feita diretamente no lançamentos de honorários nas informações oriundas da planilha de atualização de cálculos.";

    const nomeId = targetSuffix === 'principal' ? `${prefix}-nome-principal` : (prefix === 'suc' ? `adv-suc-nome-${targetSuffix}` : `${prefix}-ad-nome-${targetSuffix}`);
    const cpfId = targetSuffix === 'principal' ? `${prefix}-cpf-principal` : (prefix === 'suc' ? `adv-suc-cpf-${targetSuffix}` : `${prefix}-ad-cpf-${targetSuffix}`);
    const nomeEl = document.getElementById(nomeId);
    const cpfEl = document.getElementById(cpfId);

    const applyReadonly = (el) => {
        if (el) {
            el.readOnly = isReadonly;
            el.style.backgroundColor = isReadonly ? bg : bgEditable;
            if (isReadonly) {
                el.onclick = () => showCustomAlert(alertMsg);
            } else {
                el.onclick = null;
            }
        }
    };

    applyReadonly(nomeEl);
    applyReadonly(cpfEl);

    const ids = [
        targetSuffix === 'principal' ? `${prefix}-principal-resultado` : (prefix === 'suc' ? `adv-suc-resultado-${targetSuffix}` : `${prefix}-ad-resultado-${targetSuffix}`),
        targetSuffix === 'principal' ? `${prefix}-principal-ir` : (prefix === 'suc' ? `adv-suc-ir-${targetSuffix}` : `${prefix}-ad-ir-${targetSuffix}`)
    ];
    if (prefix === 'adv') {
        const percId = targetSuffix === 'principal' ? 'adv-principal-percentual' : `adv-ad-percentual-${targetSuffix}`;
        if (document.getElementById(percId)) ids.push(percId);
    }
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.tagName === 'INPUT') {
            applyReadonly(el);
        }
    });

    const retencaoIds = [
        targetSuffix === 'principal' ? `${prefix}-principal-retencao` : (prefix === 'suc' ? `adv-suc-retencao-${targetSuffix}` : `${prefix}-ad-retencao-${targetSuffix}`),
        targetSuffix === 'principal' ? `${prefix}-principal-retencao-motivo` : (prefix === 'suc' ? `adv-suc-retencao-motivo-${targetSuffix}` : `${prefix}-ad-retencao-motivo-${targetSuffix}`)
    ];
    
    retencaoIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.tagName === 'INPUT') {
            el.readOnly = false;
            el.style.backgroundColor = bgEditable;
            el.onclick = null;
        }
    });

    const containerSelector = targetSuffix === 'principal' 
        ? `#${prefix}-principal-block`
        : (prefix === 'suc' ? `#adv-sucumbencial-${targetSuffix}` : `#${prefix}-adicional-${targetSuffix}`);
    
    const btnDel = document.querySelector(`${containerSelector} .btn-delete-block`);
    if (btnDel) btnDel.style.display = isReadonly ? 'none' : 'inline-flex';
}

function sincronizarNomesParaModal(prefix) {
    const modalNomes = document.querySelectorAll(`.modal-${prefix}-nome`);
    const modalCpfs = document.querySelectorAll(`.modal-${prefix}-cpf`);

    let modalIndex = 0;
    const checkBlock = (suffix) => {
        let resId;
        if (prefix === 'adv') resId = suffix === 'principal' ? 'adv-principal-resultado' : `adv-ad-resultado-${suffix}`;
        else if (prefix === 'perito') resId = suffix === 'principal' ? 'perito-principal-resultado' : `perito-ad-resultado-${suffix}`;
        else if (prefix === 'suc') resId = `adv-suc-resultado-${suffix}`;

        const resEl = document.getElementById(resId);
        
        if (resEl && resEl.readOnly) {
            if (modalIndex < modalNomes.length) {
                let nomeId, cpfId;
                if (prefix === 'adv') { nomeId = suffix === 'principal' ? 'adv-nome-principal' : `adv-ad-nome-${suffix}`; cpfId = suffix === 'principal' ? 'adv-cpf-principal' : `adv-ad-cpf-${suffix}`; }
                else if (prefix === 'perito') { nomeId = suffix === 'principal' ? 'perito-nome-principal' : `perito-ad-nome-${suffix}`; cpfId = suffix === 'principal' ? 'perito-cpf-principal' : `perito-ad-cpf-${suffix}`; }
                else if (prefix === 'suc') { nomeId = `adv-suc-nome-${suffix}`; cpfId = `adv-suc-cpf-${suffix}`; }

                const tabNome = document.getElementById(nomeId);
                const tabCpf = document.getElementById(cpfId);
                
                if (tabNome && tabNome.value.trim() !== '') modalNomes[modalIndex].value = tabNome.value;
                if (tabCpf && tabCpf.value.trim() !== '') modalCpfs[modalIndex].value = tabCpf.value;
                
                modalIndex++;
            }
        }
    };

    if (prefix === 'adv' || prefix === 'perito') checkBlock('principal');
    
    let count = 0;
    if (prefix === 'adv') count = advogadoAdicionalCount;
    else if (prefix === 'perito') count = peritoAdicionalCount;
    else if (prefix === 'suc') count = advSucumbencialCount;

    for (let i = 1; i <= count; i++) {
        checkBlock(i);
    }
}

function abrirModalAdvogados(focoSucumbencial = false) {
    sincronizarNomesParaModal('adv');
    sincronizarNomesParaModal('suc');
    document.getElementById('modal-advogados').style.display = 'block';
    if (focoSucumbencial) {
        const chk = document.getElementById('chk-habilitar-sucumbenciais');
        if (chk && !chk.checked) {
            chk.checked = true;
            toggleModalSucumbenciais(chk);
        }
    }
}

function toggleModalSucumbenciais(checkbox) {
    if (checkbox.checked) {
        if (!sucumbenciaisConfirmado) {
            showCustomConfirm("ATENÇÃO: Os honorários sucumbenciais devem ter Processo Precatório específico para o credor (advogado). Caso seja incluído nesse Precatório a liberação desses honorários, faz-necessário informar a Vara responsável sobre tal ocorreção para fins de melhorias no processo. Então, deseja realmente incluir?", function (confirmacao) {
                if (confirmacao) {
                    sucumbenciaisConfirmado = true;
                    const section = document.getElementById('modal-sucumbenciais-section');
                    section.style.display = 'block';
                    setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                } else {
                    checkbox.checked = false;
                }
            });
        } else {
            const section = document.getElementById('modal-sucumbenciais-section');
            section.style.display = 'block';
            setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        }
    } else {
        cancelarSucumbenciaisModal();
    }
}

function cancelarSucumbenciaisModal() {
    document.querySelectorAll('#chk-habilitar-sucumbenciais').forEach(chk => chk.checked = false);
    const section = document.getElementById('modal-sucumbenciais-section');
    if (section) section.style.display = 'none';
    
    const listSucModal = document.getElementById('lista-sucumbenciais-modal');
    if (listSucModal) listSucModal.innerHTML = '';
    modalSucumbenciaisCount = 0;
    
    sucumbenciaisConfirmado = false;
}

function fecharModalAdvogados() {
    document.getElementById('modal-advogados').style.display = 'none';
}

function adicionarLinhaAdvogadoModal() {
    modalAdvogadosCount++;
    const container = document.getElementById('lista-advogados-modal');
    const html = `
        <div class="honorarios-top-row" id="modal-adv-row-${modalAdvogadosCount}" style="display: flex; gap: 10px; align-items: flex-end; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed var(--info-border);">
            <div style="flex: 5;">
                <label style="font-size: 0.85em;">Nome do(a) Advogado(a):</label>
                <input type="text" id="modal-adv-nome-${modalAdvogadosCount}" class="valor-input modal-adv-nome" spellcheck="true" oninput="formatarTextoMaiusculo(this)" placeholder="" style="width: 100%; text-align: left;">
            </div>
            <div style="flex: 2;">
                <label style="font-size: 0.85em;">CPF/CNPJ:</label>
                <input type="text" id="modal-adv-cpf-${modalAdvogadosCount}" class="valor-input modal-adv-cpf" maxlength="18" oninput="formatarDocumento(this, 'AMBOS')" style="width: 100%; text-align: left;">
            </div>
            <div style="flex: 1.5;">
                <label style="font-size: 0.85em;">Honorários Líquido:</label>
                <input type="text" id="modal-adv-hon-${modalAdvogadosCount}" class="valor-input modal-adv-hon" placeholder="0,00" style="width: 100%; text-align: right;" oninput="formatarMoeda(this); calcularTotaisModalAdvogados()">
            </div>
            <div style="flex: 1.5;">
                <label style="font-size: 0.85em;">Retenção IRRF:</label>
                <input type="text" id="modal-adv-irrf-${modalAdvogadosCount}" class="valor-input modal-adv-irrf" placeholder="0,00" style="width: 100%; text-align: right;" oninput="formatarMoeda(this); calcularTotaisModalAdvogados()">
            </div>
            <div style="flex: 0.5; display: flex; justify-content: center; padding-bottom: 6px;">
                <button type="button" class="btn-delete-block no-print" onclick="removerLinhaModal('modal-adv-row-${modalAdvogadosCount}', 'adv')" title="Excluir Linha"><i class="fas fa-times"></i></button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function adicionarLinhaSucumbencialModal() {
    modalSucumbenciaisCount++;
    const container = document.getElementById('lista-sucumbenciais-modal');
    const html = `
        <div class="honorarios-top-row" id="modal-suc-row-${modalSucumbenciaisCount}" style="display: flex; gap: 10px; align-items: flex-end; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed var(--info-border);">
            <div style="flex: 5;">
                <label style="font-size: 0.85em;">Nome do(a) Advogado(a):</label>
                <input type="text" id="modal-suc-nome-${modalSucumbenciaisCount}" class="valor-input modal-suc-nome" spellcheck="true" oninput="formatarTextoMaiusculo(this)" style="width: 100%; text-align: left;">
            </div>
            <div style="flex: 2;">
                <label style="font-size: 0.85em;">CPF/CNPJ:</label>
                <input type="text" id="modal-suc-cpf-${modalSucumbenciaisCount}" class="valor-input modal-suc-cpf" maxlength="18" oninput="formatarDocumento(this, 'AMBOS')" style="width: 100%; text-align: left;">
            </div>
            <div style="flex: 1.5;">
                <label style="font-size: 0.85em;">Honorários Líquido:</label>
                <input type="text" id="modal-suc-hon-${modalSucumbenciaisCount}" class="valor-input modal-suc-hon" placeholder="0,00" style="width: 100%; text-align: right;" oninput="formatarMoeda(this); calcularTotaisModalSucumbenciais()">
            </div>
            <div style="flex: 1.5;">
                <label style="font-size: 0.85em;">Retenção IRRF:</label>
                <input type="text" id="modal-suc-irrf-${modalSucumbenciaisCount}" class="valor-input modal-suc-irrf" placeholder="0,00" style="width: 100%; text-align: right;" oninput="formatarMoeda(this); calcularTotaisModalSucumbenciais()">
            </div>
            <div style="flex: 0.5; display: flex; justify-content: center; padding-bottom: 6px;">
                <button type="button" class="btn-delete-block no-print" onclick="removerLinhaModal('modal-suc-row-${modalSucumbenciaisCount}', 'suc')" title="Excluir Linha"><i class="fas fa-times"></i></button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function calcularTotaisModalAdvogados() {
    let totalHon = 0;
    let totalIrrf = 0;
    document.querySelectorAll('.modal-adv-hon').forEach(el => totalHon += getNumericValueFromInput(el));
    document.querySelectorAll('.modal-adv-irrf').forEach(el => totalIrrf += getNumericValueFromInput(el));

    let totalSucHon = 0;
    let totalSucIrrf = 0;
    document.querySelectorAll('.modal-suc-hon').forEach(el => totalSucHon += getNumericValueFromInput(el));
    document.querySelectorAll('.modal-suc-irrf').forEach(el => totalSucIrrf += getNumericValueFromInput(el));

    document.getElementById('total-hon-adv-modal').textContent = formatarMoedaParaExibicao(totalHon + totalSucHon);
    document.getElementById('total-irrf-adv-modal').textContent = formatarMoedaParaExibicao(totalIrrf + totalSucIrrf);
}

function calcularTotaisModalSucumbenciais() {
    let totalHon = 0;
    let totalIrrf = 0;
    document.querySelectorAll('.modal-suc-hon').forEach(el => totalHon += getNumericValueFromInput(el));
    document.querySelectorAll('.modal-suc-irrf').forEach(el => totalIrrf += getNumericValueFromInput(el));
    
    calcularTotaisModalAdvogados(); 
}

function confirmarModalAdvogados() {
    const honRows = document.querySelectorAll('.modal-adv-hon');
    const irrfRows = document.querySelectorAll('.modal-adv-irrf');
    const nomeRows = document.querySelectorAll('.modal-adv-nome');
    const cpfRows = document.querySelectorAll('.modal-adv-cpf');

    const sucHonRows = document.querySelectorAll('.modal-suc-hon');
    const sucIrrfRows = document.querySelectorAll('.modal-suc-irrf');
    const sucNomeRows = document.querySelectorAll('.modal-suc-nome');
    const sucCpfRows = document.querySelectorAll('.modal-suc-cpf');
    
    for (let i = 0; i < honRows.length; i++) {
        const vHon = getNumericValueFromInput(honRows[i]);
        const vIrrf = getNumericValueFromInput(irrfRows[i]);
        if (vHon > 0 || vIrrf > 0) {
            const nome = nomeRows[i] ? nomeRows[i].value.trim() : '';
            const cpf = cpfRows[i] ? cpfRows[i].value.trim() : '';
            if (!nome || !cpf) {
                showCustomAlert("Por favor, informe o Nome e o CPF/CNPJ de todos os advogados na caixa de diálogo.");
                return;
            }
        }
    }

    fecharModalAdvogados();

    const manualAdvs = [];
    const modalAdvsRetentions = {};
    const getRetentionKey = (nome, cpf) => (nome + '|' + cpf).toUpperCase().trim();

    const checkBlock = (suffix) => {
        const nomeId = suffix === 'principal' ? 'adv-nome-principal' : `adv-ad-nome-${suffix}`;
        const nomeEl = document.getElementById(nomeId);
        const resEl = document.getElementById(suffix === 'principal' ? 'adv-principal-resultado' : `adv-ad-resultado-${suffix}`);
        if (nomeEl && resEl) {
            const cpf = document.getElementById(suffix === 'principal' ? 'adv-cpf-principal' : `adv-ad-cpf-${suffix}`)?.value || '';
            if (!resEl.readOnly) {
                const perc = document.getElementById(suffix === 'principal' ? 'adv-principal-percentual' : `adv-ad-percentual-${suffix}`)?.value || '';
                const hon = resEl ? (resEl.tagName === 'INPUT' ? resEl.value : resEl.textContent) : '';
                const ir = document.getElementById(suffix === 'principal' ? 'adv-principal-ir' : `adv-ad-ir-${suffix}`)?.value || '';
                const ret = document.getElementById(suffix === 'principal' ? 'adv-principal-retencao' : `adv-ad-retencao-${suffix}`)?.value || '';
                const mot = document.getElementById(suffix === 'principal' ? 'adv-principal-retencao-motivo' : `adv-ad-retencao-motivo-${suffix}`)?.value || '';
                
                if (nomeEl.value || cpf || hon || ir || ret) {
                    manualAdvs.push({nome: nomeEl.value, cpf, perc, hon, ir, ret, mot});
                }
            } else {
                const ret = document.getElementById(suffix === 'principal' ? 'adv-principal-retencao' : `adv-ad-retencao-${suffix}`)?.value || '';
                const mot = document.getElementById(suffix === 'principal' ? 'adv-principal-retencao-motivo' : `adv-ad-retencao-motivo-${suffix}`)?.value || '';
                modalAdvsRetentions[getRetentionKey(nomeEl.value, cpf)] = {ret, mot};
            }
        }
    };

    checkBlock('principal');
    for (let i = 1; i <= advogadoAdicionalCount; i++) {
        checkBlock(i);
    }
    
    for (let i = 0; i < sucHonRows.length; i++) {
        const vHon = getNumericValueFromInput(sucHonRows[i]);
        const vIrrf = getNumericValueFromInput(sucIrrfRows[i]);
        if (vHon > 0 || vIrrf > 0) {
            const nome = sucNomeRows[i] ? sucNomeRows[i].value.trim() : '';
            const cpf = sucCpfRows[i] ? sucCpfRows[i].value.trim() : '';
            if (!nome || !cpf) {
                showCustomAlert("Por favor, informe o Nome e o CPF/CNPJ de todos os advogados (sucumbenciais) na caixa de diálogo.");
                return;
            }
        }
    }

    removerAdvogadoPrincipal(true); 
    setBlockReadonly('adv', 'principal', false);
    const existingAdicionais = [];
    for (let i = 1; i <= advogadoAdicionalCount; i++) existingAdicionais.push(i);
    existingAdicionais.forEach(i => removerParte(`adv-adicional-${i}`, true));
    advogadoAdicionalCount = 0;

    let totalInserted = 0;

    const applyToBlock = (data, isModal) => {
        let targetSuffix = totalInserted === 0 ? 'principal' : '';
        if (totalInserted > 0) {
            adicionarAdvogadoAdicional();
            targetSuffix = advogadoAdicionalCount;
        } else {
            const princBlock = document.getElementById('adv-principal-block');
            if (princBlock) {
                princBlock.style.display = 'block';
                princBlock.open = true;
            }
            targetSuffix = 'principal';
        }

        const nId = targetSuffix === 'principal' ? 'adv-nome-principal' : `adv-ad-nome-${targetSuffix}`;
        const cId = targetSuffix === 'principal' ? 'adv-cpf-principal' : `adv-ad-cpf-${targetSuffix}`;
        const resId = targetSuffix === 'principal' ? 'adv-principal-resultado' : `adv-ad-resultado-${targetSuffix}`;
        const irId = targetSuffix === 'principal' ? 'adv-principal-ir' : `adv-ad-ir-${targetSuffix}`;
        const retId = targetSuffix === 'principal' ? 'adv-principal-retencao' : `adv-ad-retencao-${targetSuffix}`;
        const motId = targetSuffix === 'principal' ? 'adv-principal-retencao-motivo' : `adv-ad-retencao-motivo-${targetSuffix}`;
        const percId = targetSuffix === 'principal' ? 'adv-principal-percentual' : `adv-ad-percentual-${targetSuffix}`;

        if (document.getElementById(nId)) document.getElementById(nId).value = data.nome || '';
        if (document.getElementById(cId)) document.getElementById(cId).value = data.cpf || '';
        if (document.getElementById(irId)) document.getElementById(irId).value = data.ir || '';
        if (document.getElementById(retId)) document.getElementById(retId).value = data.ret || '';
        if (document.getElementById(motId)) document.getElementById(motId).value = data.mot || '';
        if (document.getElementById(percId)) document.getElementById(percId).value = data.perc || '';

        const resEl = document.getElementById(resId);
        if (resEl) {
            if (resEl.tagName === 'INPUT') resEl.value = data.hon || '';
            else resEl.textContent = data.hon || '0,00';
        }

        setBlockReadonly('adv', targetSuffix, isModal);
        atualizarLiquidoAdvogado(targetSuffix);
        totalInserted++;
    };

    honRows.forEach((el, index) => {
        const vHon = getNumericValueFromInput(el);
        const vIrrf = getNumericValueFromInput(irrfRows[index]);
        const honStr = (vHon + vIrrf) > 0 ? formatarMoedaParaExibicao(vHon + vIrrf) : '';
        const irStr = vIrrf > 0 ? formatarMoedaParaExibicao(vIrrf) : '';
        const vNome = nomeRows[index] ? nomeRows[index].value : '';
        const vCpf = cpfRows[index] ? cpfRows[index].value : '';

        if (vHon === 0 && vIrrf === 0 && vNome === '' && vCpf === '') {
            return; // Ignora linhas completamente vazias
        }

        const retInfo = modalAdvsRetentions[getRetentionKey(vNome, vCpf)] || {ret: '', mot: ''};

        applyToBlock({nome: vNome, cpf: vCpf, hon: honStr, ir: irStr, ret: retInfo.ret, mot: retInfo.mot, perc: ''}, true);
    });

    manualAdvs.forEach(m => applyToBlock(m, false));

    const manualSucs = [];
    const modalSucsRetentions = {};
    for (let i = 1; i <= advSucumbencialCount; i++) {
        const resEl = document.getElementById(`adv-suc-resultado-${i}`);
        if (resEl) {
            const nome = document.getElementById(`adv-suc-nome-${i}`)?.value || '';
            const cpf = document.getElementById(`adv-suc-cpf-${i}`)?.value || '';
            if (!resEl.readOnly) {
                const hon = resEl.tagName === 'INPUT' ? resEl.value : resEl.textContent;
                const ir = document.getElementById(`adv-suc-ir-${i}`)?.value || '';
                const ret = document.getElementById(`adv-suc-retencao-${i}`)?.value || '';
                const mot = document.getElementById(`adv-suc-retencao-motivo-${i}`)?.value || '';
                if (nome || cpf || hon || ir || ret) {
                    manualSucs.push({nome, cpf, hon, ir, ret, mot});
                }
            } else {
                const ret = document.getElementById(`adv-suc-retencao-${i}`)?.value || '';
                const mot = document.getElementById(`adv-suc-retencao-motivo-${i}`)?.value || '';
                modalSucsRetentions[getRetentionKey(nome, cpf)] = {ret, mot};
            }
        }
    }

    const existingSucs = [];
    for (let i = 1; i <= advSucumbencialCount; i++) existingSucs.push(i);
    existingSucs.forEach(i => removerParte(`adv-sucumbencial-${i}`, true));
    advSucumbencialCount = 0;

    const applyToBlockSuc = (data, isModal) => {
        adicionarAdvogadoSucumbencial();
        const targetSuffix = advSucumbencialCount;
        document.getElementById(`adv-suc-nome-${targetSuffix}`).value = data.nome || '';
        document.getElementById(`adv-suc-cpf-${targetSuffix}`).value = data.cpf || '';
        document.getElementById(`adv-suc-ir-${targetSuffix}`).value = data.ir || '';
        document.getElementById(`adv-suc-retencao-${targetSuffix}`).value = data.ret || '';
        document.getElementById(`adv-suc-retencao-motivo-${targetSuffix}`).value = data.mot || '';
        const resEl = document.getElementById(`adv-suc-resultado-${targetSuffix}`);
        if (resEl) {
            if (resEl.tagName === 'INPUT') resEl.value = data.hon || '';
            else resEl.textContent = data.hon || '0,00';
        }
        setBlockReadonly('suc', targetSuffix, isModal);
        atualizarLiquidoSucumbencial(targetSuffix);
    };

    sucHonRows.forEach((el, index) => {
        const vHon = getNumericValueFromInput(el);
        const vIrrf = getNumericValueFromInput(sucIrrfRows[index]);
        const vNome = sucNomeRows[index]?.value || '';
        const vCpf = sucCpfRows[index]?.value || '';
        
        if (vHon === 0 && vIrrf === 0 && vNome === '' && vCpf === '') {
            return; // Ignora linhas completamente vazias
        }

        if (vHon > 0 || vIrrf > 0) {
            const honStr = formatarMoedaParaExibicao(vHon + vIrrf);
            const irStr = vIrrf > 0 ? formatarMoedaParaExibicao(vIrrf) : '';
            const retInfo = modalSucsRetentions[getRetentionKey(vNome, vCpf)] || {ret: '', mot: ''};
            applyToBlockSuc({nome: vNome, cpf: vCpf, hon: honStr, ir: irStr, ret: retInfo.ret, mot: retInfo.mot}, true);
        }
    });

    manualSucs.forEach(m => applyToBlockSuc(m, false));
    sincronizarSucumbenciaisParaGeral();

    if (honRows.length > 0) {
        const btnFixado = document.getElementById('adv-valor-fixado-opt');
        if (btnFixado) {
            btnFixado.checked = true;
            toggleAdvHonorariosFields();
        }
    }

    const advPrincipalBlockFinal = document.getElementById('adv-principal-block');
    if (advPrincipalBlockFinal) {
        advPrincipalBlockFinal.open = true;
    }

    document.querySelectorAll('.advogado-adicional-details').forEach(el => el.open = true);

    sincronizarAdvogadosParaGeral();
    atualizarQuadroResumo();
    atualizarCredoresAdicionais();
}

function abrirModalPeritos() {
    sincronizarNomesParaModal('perito');
    document.getElementById('modal-peritos').style.display = 'block';
}

function fecharModalPeritos() {
    document.getElementById('modal-peritos').style.display = 'none';
}

function abrirPainelAjuda() {
    document.getElementById('modal-ajuda').style.display = 'block';
}

function fecharPainelAjuda() {
    const chk = document.getElementById('chk-nao-mostrar-ajuda');
    if (chk && chk.checked) {
        localStorage.setItem('hideHelpModal', 'true');
    }
    document.getElementById('modal-ajuda').style.display = 'none';
}

function adicionarLinhaPeritoModal() {
    modalPeritosCount++;
    const container = document.getElementById('lista-peritos-modal');
    const html = `
        <div class="honorarios-top-row" id="modal-per-row-${modalPeritosCount}" style="display: flex; gap: 10px; align-items: flex-end; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed var(--info-border);">
            <div style="flex: 5;">
                <label style="font-size: 0.85em;">Nome do(a) Perito(a):</label>
                <input type="text" id="modal-per-nome-${modalPeritosCount}" class="valor-input modal-per-nome" spellcheck="true" oninput="formatarTextoMaiusculo(this)" placeholder="" style="width: 100%; text-align: left;">
            </div>
            <div style="flex: 2;">
                <label style="font-size: 0.85em;">CPF/CNPJ:</label>
                <input type="text" id="modal-per-cpf-${modalPeritosCount}" class="valor-input modal-per-cpf" maxlength="18" oninput="formatarDocumento(this, 'AMBOS')" style="width: 100%; text-align: left;">
            </div>

            <div style="flex: 1.5;">
                <label style="font-size: 0.85em;">Honorários Líquido:</label>
                <input type="text" id="modal-per-hon-${modalPeritosCount}" class="valor-input modal-per-hon" placeholder="0,00" style="width: 100%; text-align: right;" oninput="formatarMoeda(this); calcularTotaisModalPeritos()">
            </div>
            <div style="flex: 1.5;">
                <label style="font-size: 0.85em;">Retenção IRRF:</label>
                <input type="text" id="modal-per-irrf-${modalPeritosCount}" class="valor-input modal-per-irrf" placeholder="0,00" style="width: 100%; text-align: right;" oninput="formatarMoeda(this); calcularTotaisModalPeritos()">
            </div>
            <div style="flex: 0.5; display: flex; justify-content: center; padding-bottom: 6px;">
                <button type="button" class="btn-delete-block no-print" onclick="removerLinhaModal('modal-per-row-${modalPeritosCount}', 'per')" title="Excluir Linha"><i class="fas fa-times"></i></button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function calcularTotaisModalPeritos() {
    let totalHon = 0;
    let totalIrrf = 0;
    document.querySelectorAll('.modal-per-hon').forEach(el => totalHon += getNumericValueFromInput(el));
    document.querySelectorAll('.modal-per-irrf').forEach(el => totalIrrf += getNumericValueFromInput(el));

    document.getElementById('total-hon-per-modal').textContent = formatarMoedaParaExibicao(totalHon);
    document.getElementById('total-irrf-per-modal').textContent = formatarMoedaParaExibicao(totalIrrf);
}

function confirmarModalPeritos() {
    const honRows = document.querySelectorAll('.modal-per-hon');
    const irrfRows = document.querySelectorAll('.modal-per-irrf');
    const nomeRows = document.querySelectorAll('.modal-per-nome');
    const cpfRows = document.querySelectorAll('.modal-per-cpf');
    
    for (let i = 0; i < honRows.length; i++) {
        const vHon = getNumericValueFromInput(honRows[i]);
        const vIrrf = getNumericValueFromInput(irrfRows[i]);
        if (vHon > 0 || vIrrf > 0) {
            const nome = nomeRows[i] ? nomeRows[i].value.trim() : '';
            const cpf = cpfRows[i] ? cpfRows[i].value.trim() : '';
            if (!nome || !cpf) {
                showCustomAlert("Por favor, informe o Nome e o CPF/CNPJ de todos os peritos na caixa de diálogo.");
                return;
            }
        }
    }

    fecharModalPeritos();

    const manualPers = [];
    const modalPersRetentions = {};
    const getRetentionKey = (nome, cpf) => (nome + '|' + cpf).toUpperCase().trim();

    const checkBlock = (suffix) => {
        const nomeId = suffix === 'principal' ? 'perito-nome-principal' : `perito-ad-nome-${suffix}`;
        const nomeEl = document.getElementById(nomeId);
        const resEl = document.getElementById(suffix === 'principal' ? 'perito-principal-resultado' : `perito-ad-resultado-${suffix}`);
        if (nomeEl && resEl) {
            const cpf = document.getElementById(suffix === 'principal' ? 'perito-cpf-principal' : `perito-ad-cpf-${suffix}`)?.value || '';
            if (!resEl.readOnly) {
                const hon = resEl ? (resEl.tagName === 'INPUT' ? resEl.value : resEl.textContent) : '';
                const ir = document.getElementById(suffix === 'principal' ? 'perito-principal-ir' : `perito-ad-ir-${suffix}`)?.value || '';
                const ret = document.getElementById(suffix === 'principal' ? 'perito-principal-retencao' : `perito-ad-retencao-${suffix}`)?.value || '';
                const mot = document.getElementById(suffix === 'principal' ? 'perito-principal-retencao-motivo' : `perito-ad-retencao-motivo-${suffix}`)?.value || '';
                
                if (nomeEl.value || cpf || hon || ir || ret) {
                    manualPers.push({nome: nomeEl.value, cpf, hon, ir, ret, mot});
                }
            } else {
                const ret = document.getElementById(suffix === 'principal' ? 'perito-principal-retencao' : `perito-ad-retencao-${suffix}`)?.value || '';
                const mot = document.getElementById(suffix === 'principal' ? 'perito-principal-retencao-motivo' : `perito-ad-retencao-motivo-${suffix}`)?.value || '';
                modalPersRetentions[getRetentionKey(nomeEl.value, cpf)] = {ret, mot};
            }
        }
    };

    checkBlock('principal');
    for (let i = 1; i <= peritoAdicionalCount; i++) {
        checkBlock(i);
    }

    removerPeritoPrincipal(true); 
    setBlockReadonly('perito', 'principal', false);
    const existingAdicionais = [];
    for (let i = 1; i <= peritoAdicionalCount; i++) existingAdicionais.push(i);
    existingAdicionais.forEach(i => removerParte(`perito-adicional-${i}`, true));
    peritoAdicionalCount = 0;

    let totalInserted = 0;

    const applyToBlock = (data, isModal) => {
        let targetSuffix = totalInserted === 0 ? 'principal' : '';
        if (totalInserted > 0) {
            adicionarPeritoAdicional();
            targetSuffix = peritoAdicionalCount;
        } else {
            const princBlock = document.getElementById('perito-principal-block');
            if (princBlock) {
                princBlock.style.display = 'block';
                princBlock.open = true;
            }
            targetSuffix = 'principal';
        }

        const nId = targetSuffix === 'principal' ? 'perito-nome-principal' : `perito-ad-nome-${targetSuffix}`;
        const cId = targetSuffix === 'principal' ? 'perito-cpf-principal' : `perito-ad-cpf-${targetSuffix}`;
        const resId = targetSuffix === 'principal' ? 'perito-principal-resultado' : `perito-ad-resultado-${targetSuffix}`;
        const irId = targetSuffix === 'principal' ? 'perito-principal-ir' : `perito-ad-ir-${targetSuffix}`;
        const retId = targetSuffix === 'principal' ? 'perito-principal-retencao' : `perito-ad-retencao-${targetSuffix}`;
        const motId = targetSuffix === 'principal' ? 'perito-principal-retencao-motivo' : `perito-ad-retencao-motivo-${targetSuffix}`;

        if (document.getElementById(nId)) document.getElementById(nId).value = data.nome || '';
        if (document.getElementById(cId)) document.getElementById(cId).value = data.cpf || '';
        if (document.getElementById(irId)) document.getElementById(irId).value = data.ir || '';
        if (document.getElementById(retId)) document.getElementById(retId).value = data.ret || '';
        if (document.getElementById(motId)) document.getElementById(motId).value = data.mot || '';

        const resEl = document.getElementById(resId);
        if (resEl) {
            if (resEl.tagName === 'INPUT') resEl.value = data.hon || '';
            else resEl.textContent = data.hon || '0,00';
            
            if (isModal) resEl.dataset.origem = 'modal';
        }

        setBlockReadonly('perito', targetSuffix, isModal);
        atualizarLiquidoPerito(targetSuffix);
        totalInserted++;
    };

    honRows.forEach((el, index) => {
        const vHon = getNumericValueFromInput(el);
        const vIrrf = getNumericValueFromInput(irrfRows[index]);
        const honStr = (vHon + vIrrf) > 0 ? formatarMoedaParaExibicao(vHon + vIrrf) : '';
        const irStr = vIrrf > 0 ? formatarMoedaParaExibicao(vIrrf) : '';
        const vNome = nomeRows[index] ? nomeRows[index].value : '';
        const vCpf = cpfRows[index] ? cpfRows[index].value : '';

        if (vHon === 0 && vIrrf === 0 && vNome === '' && vCpf === '') {
            return; // Ignora linhas completamente vazias
        }

        const retInfo = modalPersRetentions[getRetentionKey(vNome, vCpf)] || {ret: '', mot: ''};

        applyToBlock({nome: vNome, cpf: vCpf, hon: honStr, ir: irStr, ret: retInfo.ret, mot: retInfo.mot}, true);
    });

    manualPers.forEach(m => applyToBlock(m, false));

    const peritoPrincipalBlockFinal = document.getElementById('perito-principal-block');
    if (peritoPrincipalBlockFinal) {
        peritoPrincipalBlockFinal.open = true;
    }

    document.querySelectorAll('.perito-adicional-details').forEach(el => el.open = true);

    sincronizarPeritosParaPrincipal();
    atualizarQuadroResumo();
}

function removerLinhaModal(rowId, tipo) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    if (tipo === 'adv') calcularTotaisModalAdvogados();
    if (tipo === 'per') calcularTotaisModalPeritos();
    if (tipo === 'suc') {
        calcularTotaisModalSucumbenciais();
        const container = document.getElementById('lista-sucumbenciais-modal');
        if (container && container.children.length === 0) {
            cancelarSucumbenciaisModal();
        }
    }
}