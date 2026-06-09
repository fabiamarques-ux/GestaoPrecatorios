// =======================================================================
// FUNÇÕES DE ATUALIZAÇÃO DE VALORES E DISPLAYS
// =======================================================================
function atualizarSomaLiquido() {
    const liquidoPlanilha = getNumericValue('liquido-reclamante-calculo');
    const previdencia = getNumericValue('valor-previdencia-privada');
    const honorarios = getNumericValue('input-honorarios-advocaticios');
    const irrf = getNumericValue('input-irrf-honorarios');
    const honorariosPericiais = getNumericValue('input-honorarios-periciais');
    const irrfPericiais = getNumericValue('input-irrf-periciais');
    const custasJudiciais = getNumericValue('input-custas-judiciais');

    let novoLiquido = liquidoPlanilha + previdencia + honorarios + irrf + custasJudiciais + honorariosPericiais + irrfPericiais;

    document.getElementById('valor-deposito-judicial').value = formatarMoedaParaExibicao(novoLiquido);
    atualizarTotalDevidoReclamada();
}

function atualizarTotalDevidoReclamada() {
    const liquido = getNumericValue('valor-deposito-judicial');
    const inssReclamante = getNumericValue('inss-reclamante');
    const inssReclamada = getNumericValue('inss-reclamada');
    const fgts = getNumericValue('fgts-viculada');
    const ir = getNumericValue('ir-valor');
    const totalGeral = liquido + inssReclamante + inssReclamada + fgts + ir;
    const campoTotal = document.getElementById('valor-bruto-reclamante');
    if (campoTotal) {
        campoTotal.textContent = formatarMoedaParaExibicao(totalGeral);
    }
    atualizarBasesDeCalculo();
    verificarTravasHonorarios();
}

function atualizarBasesDeCalculo() {
    const fgts = getNumericValue('fgts-viculada');
    
    const containerFgts = document.getElementById('container-fgts-base-adv');
    const containerFgtsHer = document.getElementById('container-fgts-base-her');
    const containerFgtsCes = document.getElementById('container-fgts-base-ces');
    
    if (fgts > 0) {
        const isAdvPercentual = document.getElementById('adv-percentual-opt') ? document.getElementById('adv-percentual-opt').checked : false;
        if (containerFgts) containerFgts.style.display = isAdvPercentual ? 'flex' : 'none';
        if (containerFgtsHer) containerFgtsHer.style.display = 'flex';
        if (containerFgtsCes) containerFgtsCes.style.display = 'flex';
    } else {
        if (containerFgts) containerFgts.style.display = 'none';
        if (containerFgtsHer) containerFgtsHer.style.display = 'none';
        if (containerFgtsCes) containerFgtsCes.style.display = 'none';
        document.querySelectorAll('input[name="incluir-fgts-base"], input[name="incluir-fgts-base-her"], input[name="incluir-fgts-base-ces"]').forEach(r => r.checked = false);
    }
    
    calcularHonorarios('adv');
}

// =======================================================================
// FUNÇÕES DE CÁLCULO DE HONORÁRIOS E RATEIO
// =======================================================================
function calcularHonorarios(prefix) {
    let resultado = 0;
    const isPercentual = document.getElementById(`${prefix}-percentual-opt`).checked;

    if (prefix === 'adv') {
        const liquido = getNumericValue('liquido-reclamante-calculo');
        const previdencia = getNumericValue('valor-previdencia-privada');
        const inssReclamante = getNumericValue('inss-reclamante');
        const irValor = getNumericValue('ir-valor');
        const fgts = getNumericValue('fgts-viculada');
        
        const optSim = document.querySelector('input[name="incluir-fgts-base"][value="sim"]');
        const incluirFgts = optSim ? optSim.checked : false;
        
        const baseCalculoReal = liquido + previdencia + inssReclamante + irValor + (incluirFgts ? fgts : 0);

        if (isPercentual) {
            const percentual = getNumericValue(`adv-percentual`) / 100;
            resultado = baseCalculoReal * percentual;
        } else {
            resultado = getNumericValue(`adv-valor-fixado`);
        }
        
        document.getElementById('adv-base-calculo').textContent = formatarMoedaParaExibicao(baseCalculoReal);
        document.getElementById(`${prefix}-resultado`).textContent = formatarMoedaParaExibicao(resultado);

        const spanPercFix = document.getElementById('adv-valor-fixado-percentual');
        if (isPercentual) {
            if (spanPercFix) spanPercFix.textContent = '';
        } else {
            let percentualCalculado = baseCalculoReal > 0 ? (resultado / baseCalculoReal) * 100 : 0;
            let textoPercentual = `(${percentualCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)`;
            if (spanPercFix) spanPercFix.textContent = textoPercentual;
        }
        
        atualizarCredoresAdicionais();
    } else {
        if (isPercentual) {
            const percentual = getNumericValue(`${prefix}-percentual`) / 100;
            const baseCalculo = getNumericValue('adv-base-calculo');
            resultado = baseCalculo * percentual;
        } else {
            resultado = getNumericValue(`${prefix}-valor-fixado`);
        }
        document.getElementById(`${prefix}-resultado`).textContent = formatarMoedaParaExibicao(resultado);
        if (prefix === 'adv' || prefix === 'perito') {
            atualizarCredoresAdicionais();
        }
    }
}

function atualizarCredoresAdicionais() {
    const baseCalculoAdvogadosPrincipal = getNumericValue('adv-base-calculo');

    // --- Lógica de Rateio dos Advogados ---
    const honAdvPrincipalNumeric = getNumericValue('adv-resultado');

    const percentualPrincipal = getNumericValue('adv-principal-percentual');
    const isPrincPercentual = percentualPrincipal > 0;
    if (isPrincPercentual) {
        const valorPrincipal = (percentualPrincipal / 100) * honAdvPrincipalNumeric;
        const resultadoPrincipal = document.getElementById('adv-principal-resultado');
        if (resultadoPrincipal) {
            if (resultadoPrincipal.tagName === 'INPUT') resultadoPrincipal.value = formatarMoedaParaExibicao(valorPrincipal);
            else resultadoPrincipal.textContent = formatarMoedaParaExibicao(valorPrincipal);
        }
    }
    atualizarLiquidoAdvogado('principal');

    for (let i = 1; i <= advogadoAdicionalCount; i++) {
        const percentualRateio = getNumericValue(`adv-ad-percentual-${i}`);
        const isAdPercentual = percentualRateio > 0;
        if (isAdPercentual) {
            const valorCalculado = (percentualRateio / 100) * honAdvPrincipalNumeric;
            const resultadoSpan = document.getElementById(`adv-ad-resultado-${i}`);
            if (resultadoSpan) {
                if (resultadoSpan.tagName === 'INPUT') resultadoSpan.value = formatarMoedaParaExibicao(valorCalculado);
                else resultadoSpan.textContent = formatarMoedaParaExibicao(valorCalculado);
            }
        }
        atualizarLiquidoAdvogado(i);
    }

    // --- Lógica dos Cessionários ---
    const honAdvTotal = getNumericValue('adv-resultado');
    const pensao = getNumericValue('pensao-alimenticia');
    const outras = getNumericValue('outras-retencoes');
    const liquidoReclamanteCalculo = getNumericValue('liquido-reclamante-calculo');
    const fgts = getNumericValue('fgts-viculada');
    
    let totalPeritoAba = getNumericValue('perito-principal-resultado');
    for (let i = 1; i <= peritoAdicionalCount; i++) {
        totalPeritoAba += getNumericValue(`perito-ad-resultado-${i}`);
    }
    const planHonPeritoBruto = getNumericValue('input-honorarios-periciais') + getNumericValue('input-irrf-periciais');
    const valorDeducaoPeritos = Math.max(0, totalPeritoAba - planHonPeritoBruto);
    
    const optAdvPerc = document.getElementById('adv-percentual-opt');
    const isAdvPercentual = optAdvPerc ? optAdvPerc.checked : false;
    
    let planHonContratualBruto = 0;
    const calcContractualBlock = (suffix) => {
        const resEl = document.getElementById(suffix === 'principal' ? 'adv-principal-resultado' : `adv-ad-resultado-${suffix}`);
        const irEl = document.getElementById(suffix === 'principal' ? 'adv-principal-ir' : `adv-ad-ir-${suffix}`);
        if (resEl && resEl.readOnly) {
            planHonContratualBruto += getNumericValueFromInput(resEl) + getNumericValueFromInput(irEl);
        }
    };
    calcContractualBlock('principal');
    for (let i = 1; i <= advogadoAdicionalCount; i++) {
        calcContractualBlock(i);
    }
    
    let valorDeducaoHonorarios = Math.max(0, honAdvTotal - planHonContratualBruto);
    let cashRestante = Math.max(0, liquidoReclamanteCalculo - pensao - outras - valorDeducaoPeritos - valorDeducaoHonorarios);
    let fgtsRestante = fgts;

    const optFgtsCes = document.querySelector('input[name="incluir-fgts-base-ces"][value="sim"]');
    const incluirFgtsCes = optFgtsCes ? optFgtsCes.checked : false;
    const baseCalculoCessionario = cashRestante + (incluirFgtsCes ? fgts : 0);
    
    const displayCes = document.getElementById('base-calculo-cessionarios-display');
    if (displayCes) displayCes.textContent = formatarMoedaParaExibicao(baseCalculoCessionario);

    let totalCessionarios = 0;
    for (let i = 1; i <= cessionarioCount; i++) {
        const nomeInput = document.getElementById(`ces-nome-${i}`);
        if (!nomeInput) continue;

        let valorCalculado = 0;
        const elCesPerc = document.getElementById(`ces-percentual-${i}`);
        const percInputStr = (elCesPerc && elCesPerc.value) ? elCesPerc.value.trim() : '';
        let fractionCes = 0;

        if (percInputStr !== '') {
            const percentual = getNumericValue(`ces-percentual-${i}`);
            valorCalculado = (percentual / 100) * baseCalculoCessionario;
            fractionCes = percentual / 100;
            const resultadoSpan = document.getElementById(`ces-resultado-${i}`);
            if (resultadoSpan) {
                if (resultadoSpan.tagName === 'INPUT') resultadoSpan.value = formatarMoedaParaExibicao(valorCalculado);
                else resultadoSpan.textContent = formatarMoedaParaExibicao(valorCalculado);
            }
        } else {
            const resultadoSpan = document.getElementById(`ces-resultado-${i}`);
            if (resultadoSpan) {
                valorCalculado = getNumericValue(`ces-resultado-${i}`);
            }
            fractionCes = baseCalculoCessionario > 0 ? (valorCalculado / baseCalculoCessionario) : 0;
        }

        const baseAdvCes = baseCalculoAdvogadosPrincipal * fractionCes;

        const elCesAdvOpt = document.getElementById(`ces-adv-opt-perc-${i}`);
        const isPercGlobal = elCesAdvOpt ? elCesAdvOpt.checked : false;
        let honorariosAdvTotalBruto = 0;

        if (isPercGlobal) {
            const percAdvGlobal = getNumericValue(`ces-adv-perc-global-${i}`) / 100;
            honorariosAdvTotalBruto = baseAdvCes * percAdvGlobal;
        } else {
            honorariosAdvTotalBruto = getNumericValue(`ces-adv-fix-global-${i}`);
        }

        honorariosAdvTotalBruto = Math.min(honorariosAdvTotalBruto, valorCalculado);

        const baseAdvGlobalSpan = document.getElementById(`ces-adv-base-global-${i}`);
        if (baseAdvGlobalSpan) baseAdvGlobalSpan.textContent = formatarMoedaParaExibicao(baseAdvCes);

        const resAdvGlobalSpan = document.getElementById(`ces-adv-resultado-global-${i}`);
        if (resAdvGlobalSpan) resAdvGlobalSpan.textContent = formatarMoedaParaExibicao(honorariosAdvTotalBruto);

        let honorariosAdvTotal = 0;

        const advogados = document.querySelectorAll(`.adv-cessionario-${i}`);
        let totalPartCes = 0;
            
        if (isPercGlobal && advogados.length === 1) {
            const advId = advogados[0].dataset.advId;
            const elCesAdvPart = document.getElementById(`ces-adv-part-${advId}`);
            const partAdvStr = (elCesAdvPart && elCesAdvPart.value) ? elCesAdvPart.value.trim() : '';
            if (partAdvStr === '') {
                const advResultInput = document.getElementById(`ces-adv-resultado-${advId}`);
                if (advResultInput && document.activeElement !== advResultInput) {
                    advResultInput.value = formatarMoedaParaExibicao(honorariosAdvTotalBruto);
                }
            }
        }
            
        advogados.forEach(advBlock => {
            const advId = advBlock.dataset.advId;
            let honorariosAdvAtual = 0;
            const elCesAdvPart = document.getElementById(`ces-adv-part-${advId}`);
            const partAdvStr = (elCesAdvPart && elCesAdvPart.value) ? elCesAdvPart.value.trim() : '';

            if (partAdvStr !== '') {
                const partAdv = getNumericValue(`ces-adv-part-${advId}`) / 100;
                totalPartCes += partAdv * 100;
                honorariosAdvAtual = honorariosAdvTotalBruto * partAdv;
                honorariosAdvAtual = Math.min(honorariosAdvAtual, honorariosAdvTotalBruto);
                const advResultSpan = document.getElementById(`ces-adv-resultado-${advId}`);
                if (advResultSpan) {
                    if (advResultSpan.tagName === 'INPUT') advResultSpan.value = formatarMoedaParaExibicao(honorariosAdvAtual);
                    else advResultSpan.textContent = formatarMoedaParaExibicao(honorariosAdvAtual);
                }
            } else {
                const advResultSpan = document.getElementById(`ces-adv-resultado-${advId}`);
                if (advResultSpan) {
                    honorariosAdvAtual = getNumericValue(`ces-adv-resultado-${advId}`);
                }
            }

            honorariosAdvTotal += honorariosAdvAtual;

            const irAdv = getNumericValue(`ces-adv-ir-${advId}`);
            const retAdv = getNumericValue(`ces-adv-ret-${advId}`);
            const liqAdv = Math.max(0, honorariosAdvAtual - irAdv - retAdv);

            const advLiqSpan = document.getElementById(`ces-adv-liquido-${advId}`);
            if (advLiqSpan) advLiqSpan.textContent = formatarMoedaParaExibicao(liqAdv);
        });

        const retencao = getNumericValue(`ces-retencao-${i}`);
        const liquido = Math.max(0, valorCalculado - retencao - honorariosAdvTotal);
        const liquidoSpan = document.getElementById(`ces-liquido-${i}`);
        if (liquidoSpan) liquidoSpan.textContent = formatarMoedaParaExibicao(liquido);

        totalCessionarios += valorCalculado;
    }

    // --- Lógica dos Herdeiros ---
    if (incluirFgtsCes) {
        const fractionCesTotal = baseCalculoCessionario > 0 ? Math.min(1, totalCessionarios / baseCalculoCessionario) : 0;
        cashRestante -= cashRestante * fractionCesTotal;
        fgtsRestante -= fgts * fractionCesTotal;
    } else {
        cashRestante -= totalCessionarios;
    }
    cashRestante = Math.max(0, cashRestante);

    const optFgtsHer = document.querySelector('input[name="incluir-fgts-base-her"][value="sim"]');
    const incluirFgtsHer = optFgtsHer ? optFgtsHer.checked : false;
    const baseCalculoHerdeiro = cashRestante + (incluirFgtsHer ? fgtsRestante : 0);
    
    const displayHer = document.getElementById('base-calculo-herdeiros-display');
    if (displayHer) displayHer.textContent = formatarMoedaParaExibicao(baseCalculoHerdeiro);
    for (let i = 1; i <= herdeiroCount; i++) {
        const nomeInput = document.getElementById(`her-nome-${i}`);
        if (!nomeInput) continue;

        let valorCalculado = 0;
        const elHerPerc = document.getElementById(`her-percentual-${i}`);
        const percInputStr = (elHerPerc && elHerPerc.value) ? elHerPerc.value.trim() : '';
        let fractionHer = 0;

        if (percInputStr !== '') {
            const percentual = getNumericValue(`her-percentual-${i}`);
            valorCalculado = (percentual / 100) * baseCalculoHerdeiro;
            fractionHer = percentual / 100;
            const resultadoSpan = document.getElementById(`her-resultado-${i}`);
            if (resultadoSpan) {
                if (resultadoSpan.tagName === 'INPUT') resultadoSpan.value = formatarMoedaParaExibicao(valorCalculado);
                else resultadoSpan.textContent = formatarMoedaParaExibicao(valorCalculado);
            }
        } else {
            const resultadoSpan = document.getElementById(`her-resultado-${i}`);
            if (resultadoSpan) {
                valorCalculado = getNumericValue(`her-resultado-${i}`);
            }
            fractionHer = baseCalculoHerdeiro > 0 ? (valorCalculado / baseCalculoHerdeiro) : 0;
        }

        const baseAdvHer = baseCalculoAdvogadosPrincipal * fractionHer;

        const elHerAdvOpt = document.getElementById(`her-adv-opt-perc-${i}`);
        const isPercGlobal = elHerAdvOpt ? elHerAdvOpt.checked : false;
        let honorariosAdvTotalBruto = 0;

        if (isPercGlobal) {
            const percAdvGlobal = getNumericValue(`her-adv-perc-global-${i}`) / 100;
            honorariosAdvTotalBruto = baseAdvHer * percAdvGlobal;
        } else {
            honorariosAdvTotalBruto = getNumericValue(`her-adv-fix-global-${i}`);
        }

        honorariosAdvTotalBruto = Math.min(honorariosAdvTotalBruto, valorCalculado);

        const baseAdvGlobalSpan = document.getElementById(`her-adv-base-global-${i}`);
        if (baseAdvGlobalSpan) baseAdvGlobalSpan.textContent = formatarMoedaParaExibicao(baseAdvHer);

        const resAdvGlobalSpan = document.getElementById(`her-adv-resultado-global-${i}`);
        if (resAdvGlobalSpan) resAdvGlobalSpan.textContent = formatarMoedaParaExibicao(honorariosAdvTotalBruto);

        let honorariosAdvTotal = 0;

        const advogados = document.querySelectorAll(`.adv-herdeiro-${i}`);
        let totalPartHer = 0;
            
        if (isPercGlobal && advogados.length === 1) {
            const advId = advogados[0].dataset.advId;
            const elHerAdvPart = document.getElementById(`her-adv-part-${advId}`);
            const partAdvStr = (elHerAdvPart && elHerAdvPart.value) ? elHerAdvPart.value.trim() : '';
            if (partAdvStr === '') {
                const advResultInput = document.getElementById(`her-adv-resultado-${advId}`);
                if (advResultInput && document.activeElement !== advResultInput) {
                    advResultInput.value = formatarMoedaParaExibicao(honorariosAdvTotalBruto);
                }
            }
        }
            
        advogados.forEach(advBlock => {
            const advId = advBlock.dataset.advId;
            let honorariosAdvAtual = 0;
            const elHerAdvPart = document.getElementById(`her-adv-part-${advId}`);
            const partAdvStr = (elHerAdvPart && elHerAdvPart.value) ? elHerAdvPart.value.trim() : '';

            if (partAdvStr !== '') {
                const partAdv = getNumericValue(`her-adv-part-${advId}`) / 100;
                totalPartHer += partAdv * 100;
                honorariosAdvAtual = honorariosAdvTotalBruto * partAdv;
                honorariosAdvAtual = Math.min(honorariosAdvAtual, honorariosAdvTotalBruto);
                const advResultSpan = document.getElementById(`her-adv-resultado-${advId}`);
                if (advResultSpan) {
                    if (advResultSpan.tagName === 'INPUT') advResultSpan.value = formatarMoedaParaExibicao(honorariosAdvAtual);
                    else advResultSpan.textContent = formatarMoedaParaExibicao(honorariosAdvAtual);
                }
            } else {
                const advResultSpan = document.getElementById(`her-adv-resultado-${advId}`);
                if (advResultSpan) {
                    honorariosAdvAtual = getNumericValue(`her-adv-resultado-${advId}`);
                }
            }

            honorariosAdvTotal += honorariosAdvAtual;

            const irAdv = getNumericValue(`her-adv-ir-${advId}`);
            const retAdv = getNumericValue(`her-adv-ret-${advId}`);
            const liqAdv = Math.max(0, honorariosAdvAtual - irAdv - retAdv);

            const advLiqSpan = document.getElementById(`her-adv-liquido-${advId}`);
            if (advLiqSpan) advLiqSpan.textContent = formatarMoedaParaExibicao(liqAdv);
        });

        const retencao = getNumericValue(`her-retencao-${i}`);
        const liquido = Math.max(0, valorCalculado - retencao - honorariosAdvTotal);
        const liquidoSpan = document.getElementById(`her-liquido-${i}`);
        if (liquidoSpan) liquidoSpan.textContent = formatarMoedaParaExibicao(liquido);
    }

    atualizarQuadroResumo();
}

// =======================================================================
// CÁLCULO FINAL E RELATÓRIO
// =======================================================================
function atualizarQuadroResumo() {
    const tbody = document.getElementById('quadro-resumo-tbody');
    const tfoot = document.getElementById('quadro-resumo-tfoot');
    tbody.innerHTML = '';
    tfoot.innerHTML = '';
    let html = '';

    let globalLiberado = 0;
    let globalRetido = 0;
    let globalRecolher = 0;

    let advogadosRowsHtml = '';
    let subLibAdvogados = 0;
    let subRetAdvogados = 0;
 
    let reclamanteRetencoes = [];
    let cessionariosRetencoes = [];
    let herdeirosRetencoes = [];
    let advogadosRetencoes = [];
    let peritosRetencoes = [];

    const table = document.querySelector('.creditos-table');
    if (table) {
        table.style.borderSpacing = '0';
    }

    let isFirstGroup = true;
    const getGroupHeaderHtml = (title) => {
        let str = '';
        if (!isFirstGroup) {
            str += `<tr class="spacer-row"><td colspan="3" style="height: 20px; border: none; background: transparent; padding: 0;"></td></tr>`;
        }
        isFirstGroup = false;
        str += `<tr class="group-header"><td colspan="3" style="background-color: #F8F9FA; font-weight: bold; text-align: left; color: var(--dark-accent); padding: 12px 15px; border-top: 2px solid var(--primary-color); border-bottom: 1px solid var(--info-border); border-left: 1px solid var(--info-border); border-right: 1px solid var(--info-border); border-radius: 8px 8px 0 0; text-transform: uppercase; font-size: 1.05em; letter-spacing: 0.5px;">${title}</td></tr>`;
        return str;
    };

    const addGroupHeader = (title) => {
        html += getGroupHeaderHtml(title);
    };

    const getRowHtml = (nome, cpf, valor, cssClass = '', entreParenteses = false) => {
        const valorNumerico = parseFloat(valor) || 0;
        if (valorNumerico === 0) return '';

        if (nome.includes('IRRF retido')) {
            cssClass = 'linha-inss';
        }

        let style = cssClass === '' ? 'font-weight: bold; text-align: right;' : 'text-align: right;';

        if (cssClass === 'linha-retencao' || nome.includes('Pensão Alimentícia') || nome.includes('FGTS a Depositar')) {
            style += ' font-weight: bold;';
        }

        let valorFormatado = formatarMoedaParaExibicao(valorNumerico);
        if (entreParenteses) valorFormatado = `(${valorFormatado})`;

        let bg = cssClass === 'linha-retencao' ? '#fff3cd' : (cssClass === 'linha-inss' ? '#e0e0e0' : '#ffffff');

        let displayCpf = cpf || '';
        if (displayCpf && !['Recolhimento', 'Retenção', 'Depósito CEF'].includes(displayCpf)) {
            displayCpf = (displayCpf.length > 14 ? 'CNPJ: ' : 'CPF: ') + displayCpf;
        }

        return `
                    <tr class="${cssClass}">
                        <td style="border-left: 1px solid var(--info-border); background-color: ${bg}; padding-left: 20px; padding-top: 10px; padding-bottom: 10px; color: #444;">${nome}</td>
                        <td style="background-color: ${bg}; text-align: center; color: #666; font-weight: bold; padding-top: 10px; padding-bottom: 10px;">${displayCpf}</td>
                        <td class="value-col" style="border-right: 1px solid var(--info-border); background-color: ${bg}; ${style} padding-top: 10px; padding-bottom: 10px; color: #222;">${valorFormatado}</td>
                    </tr>`;
    };

    const addRow = (nome, cpf, valor, cssClass = '', entreParenteses = false) => {
        html += getRowHtml(nome, cpf, valor, cssClass, entreParenteses);
    };

    const addAdvogadoRow = (nome, cpf, valor, cssClass = '') => {
        advogadosRowsHtml += getRowHtml(nome, cpf, valor, cssClass, false);
    };

    const getGroupFooterHtml = () => {
        return `<tr class="group-footer">
            <td style="border-left: 1px solid var(--info-border); border-bottom: 1px solid var(--info-border); border-radius: 0 0 0 8px; padding: 0; height: 0; line-height: 0;"></td>
            <td style="border-bottom: 1px solid var(--info-border); padding: 0; height: 0; line-height: 0;"></td>
            <td style="border-right: 1px solid var(--info-border); border-bottom: 1px solid var(--info-border); border-radius: 0 0 8px 0; padding: 0; height: 0; line-height: 0;"></td>
        </tr>`;
    };

    const honAdvTotal = getNumericValue('adv-resultado');
    const inssReclamada = getNumericValue('inss-reclamada');
    const inssReclamante = getNumericValue('inss-reclamante');
    const valorBruto = getNumericValue('valor-bruto-reclamante');
    const custas = getNumericValue('input-custas-judiciais');
    const irValor = getNumericValue('ir-valor');
    let irrfAdvogados = [];

    const pensao = getNumericValue('pensao-alimenticia');
    const outras = getNumericValue('outras-retencoes');
    const totalRetencoesReclamante = pensao + outras;
    const liquidoReclamanteCalculo = getNumericValue('liquido-reclamante-calculo');
    const previdencia = getNumericValue('valor-previdencia-privada');
    const fgts = getNumericValue('fgts-viculada');
    
    const brutoReclamanteCalculadoParaPerc = liquidoReclamanteCalculo + previdencia + inssReclamante + irValor;

    const optFgtsAdv = document.querySelector('input[name="incluir-fgts-base"][value="sim"]');
    const incluirFgtsBase = optFgtsAdv ? optFgtsAdv.checked : false;

    const baseCalculoAdvogadosPrincipal = brutoReclamanteCalculadoParaPerc + (incluirFgtsBase ? fgts : 0);
    
    let totalPeritoAba = getNumericValue('perito-principal-resultado');
    for (let i = 1; i <= peritoAdicionalCount; i++) {
        totalPeritoAba += getNumericValue(`perito-ad-resultado-${i}`);
    }
    const planHonPeritoBruto = getNumericValue('input-honorarios-periciais') + getNumericValue('input-irrf-periciais');
    const valorDeducaoPeritos = Math.max(0, totalPeritoAba - planHonPeritoBruto);

    let cashRestante = Math.max(0, liquidoReclamanteCalculo - totalRetencoesReclamante - valorDeducaoPeritos);

    const optAdvPerc = document.getElementById('adv-percentual-opt');
    const isAdvPercentual = optAdvPerc ? optAdvPerc.checked : false;
    
    let planHonContratualBruto = 0;
    const calcContractualBlock = (suffix) => {
        const resEl = document.getElementById(suffix === 'principal' ? 'adv-principal-resultado' : `adv-ad-resultado-${suffix}`);
        const irEl = document.getElementById(suffix === 'principal' ? 'adv-principal-ir' : `adv-ad-ir-${suffix}`);
        if (resEl && resEl.readOnly) {
            planHonContratualBruto += getNumericValueFromInput(resEl) + getNumericValueFromInput(irEl);
        }
    };
    calcContractualBlock('principal');
    for (let i = 1; i <= advogadoAdicionalCount; i++) {
        calcContractualBlock(i);
    }
    
    let valorDeducaoHonorarios = Math.max(0, honAdvTotal - planHonContratualBruto);

    let baseHerdeirosCessionarios = Math.max(0, cashRestante - valorDeducaoHonorarios);
    let fgtsRestante = fgts;

    // 1. Cessionários
    const optFgtsCes = document.querySelector('input[name="incluir-fgts-base-ces"][value="sim"]');
    const incluirFgtsCes = optFgtsCes ? optFgtsCes.checked : false;
    const baseCalculoCessionario = baseHerdeirosCessionarios + (incluirFgtsCes ? fgts : 0);
    let subLibCessionarios = 0;
    let subRetCessionarios = 0;
    let totalCessionariosBruto = 0;
    let visCes = 1;
    let headerCessionariosAdded = false;
    let hasAdvCessionario = false;

    for (let i = 1; i <= cessionarioCount; i++) {
        const nomeInput = document.getElementById(`ces-nome-${i}`);
        if (nomeInput) {
            const nomeCessionario = nomeInput.value || `Cessionário ${visCes}`;
            let valorCessionario = 0;
            const elCesPerc = document.getElementById(`ces-percentual-${i}`);
            const percCesStr = (elCesPerc && elCesPerc.value) ? elCesPerc.value.trim() : '';
            let percDisplay = '';
            let fractionCes = 0;
            
            if (percCesStr && percCesStr !== '') {
                const percentual = getNumericValue(`ces-percentual-${i}`);
                valorCessionario = (percentual / 100) * baseCalculoCessionario;
                fractionCes = percentual / 100;
                percDisplay = percentual.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';
            } else {
                valorCessionario = getNumericValue(`ces-resultado-${i}`);
                if (baseCalculoCessionario > 0) {
                    fractionCes = valorCessionario / baseCalculoCessionario;
                    let p = fractionCes * 100;
                    percDisplay = p.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';
                }
            }
            const retencao = getNumericValue(`ces-retencao-${i}`);
            totalCessionariosBruto += valorCessionario;

            const baseAdvCes = baseCalculoAdvogadosPrincipal * fractionCes;

            if (!headerCessionariosAdded && (valorCessionario > 0)) {
                addGroupHeader('Crédito de Cessionários');
                headerCessionariosAdded = true;
            }

            let honorariosAdvTotalBruto = 0;
            const optCesAdvPerc = document.getElementById(`ces-adv-opt-perc-${i}`);
            const isPercGlobal = optCesAdvPerc ? optCesAdvPerc.checked : false;
            if (isPercGlobal) {
                honorariosAdvTotalBruto = baseAdvCes * (getNumericValue(`ces-adv-perc-global-${i}`) / 100);
            } else {
                honorariosAdvTotalBruto = getNumericValue(`ces-adv-fix-global-${i}`);
            }
            honorariosAdvTotalBruto = Math.min(honorariosAdvTotalBruto, valorCessionario);

            let honorariosAdvTotal = 0;
            const advogados = document.querySelectorAll(`.adv-cessionario-${i}`);

            advogados.forEach(advBlock => {
                const advId = advBlock.dataset.advId;
                let honorariosAdv = 0;
                const elCesAdvPart = document.getElementById(`ces-adv-part-${advId}`);
                const partAdvStr = (elCesAdvPart && elCesAdvPart.value) ? elCesAdvPart.value.trim() : '';
                if (partAdvStr && partAdvStr !== '') {
                    const partAdv = getNumericValue(`ces-adv-part-${advId}`) / 100;
                    honorariosAdv = honorariosAdvTotalBruto * partAdv;
                    honorariosAdv = Math.min(honorariosAdv, honorariosAdvTotalBruto);
                } else {
                    honorariosAdv = getNumericValue(`ces-adv-resultado-${advId}`);
                }

                let irAdv = getNumericValue(`ces-adv-ir-${advId}`);
                let retAdv = getNumericValue(`ces-adv-ret-${advId}`);
                let liquidoAdv = Math.max(0, honorariosAdv - irAdv - retAdv);
                const elCesAdvNome = document.getElementById(`ces-adv-nome-${advId}`);
                let nomeAdv = elCesAdvNome ? elCesAdvNome.value : '';
                const elCesAdvCpf = document.getElementById(`ces-adv-cpf-${advId}`);
                let cpfAdv = elCesAdvCpf ? elCesAdvCpf.value : '';

                honorariosAdvTotal += honorariosAdv;

                if (honorariosAdv > 0) {
                    hasAdvCessionario = true;
                    if (liquidoAdv > 0) {
                        let percDisplay = '';
                        if (baseAdvCes > 0) {
                            let p = (honorariosAdv / baseAdvCes) * 100;
                            percDisplay = p.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';
                        }
                        let nomeAdvFinal = `<strong>${nomeAdv || `Advogado`}</strong>`;
                        if (percDisplay) {
                            nomeAdvFinal += ` <span style="font-size: 0.85em; font-weight: normal; color: #555;">(${percDisplay})</span>`;
                        }
                        addAdvogadoRow(nomeAdvFinal, cpfAdv, liquidoAdv);
                        subLibAdvogados += liquidoAdv;
                    }
                    if (retAdv > 0) {
                        const elCesAdvRetMotivo = document.getElementById(`ces-adv-ret-motivo-${advId}`);
                        const motivoAdv = elCesAdvRetMotivo ? elCesAdvRetMotivo.value : '';
                        const nomeParaRetencao = nomeAdv || `Advogado (Cessionário ${visCes})`;
                        const labelRetencao = motivoAdv ? `<strong>Retenção</strong> - ${nomeParaRetencao} (${motivoAdv})` : `<strong>Retenção</strong> - ${nomeParaRetencao}`;
                        advogadosRetencoes.push({ label: labelRetencao, valor: retAdv });
                        subRetAdvogados += retAdv;
                    }
                    if (irAdv > 0) {
                        irrfAdvogados.push({ nome: nomeAdv || `Advogado`, valor: irAdv });
                    }
                }
            });

            const liquidoCessionario = Math.max(0, valorCessionario - retencao - honorariosAdvTotal);

            if (valorCessionario > 0) {
                if (liquidoCessionario > 0) {
                    const elCesCpf = document.getElementById(`ces-cpf-${i}`);
                    let nomeComPerc = `<strong>${nomeInput.value || `Cessionário ${visCes}`}</strong>`;
                    if (percDisplay) {
                        nomeComPerc += ` <span style="font-size: 0.85em; font-weight: normal; color: #555;">(${percDisplay})</span>`;
                    }
                    addRow(
                        nomeComPerc,
                        elCesCpf ? elCesCpf.value : '',
                        liquidoCessionario
                    );
                    subLibCessionarios += liquidoCessionario;
                }

                if (retencao > 0) {
                    const elCesRetMotivo = document.getElementById(`ces-retencao-motivo-${i}`);
                    const motivo = elCesRetMotivo ? elCesRetMotivo.value : '';
                    const nomeParaRetencao = nomeInput.value || `Cessionário ${visCes}`;
                    const labelRetencao = motivo ? `<strong>Retenção</strong> - ${nomeParaRetencao} (${motivo})` : `<strong>Retenção</strong> - ${nomeParaRetencao}`;
                    cessionariosRetencoes.push({ label: labelRetencao, valor: retencao });
                    subRetCessionarios += retencao;
                }
            }
            visCes++;
        }
    }
    if (headerCessionariosAdded) {
        if (cessionariosRetencoes.length > 0) {
            cessionariosRetencoes.forEach(ret => {
                addRow(ret.label, 'Retenção', ret.valor, 'linha-retencao');
            });
        }
        html += `<tr><td colspan="3" style="border-left: 1px solid var(--info-border); border-right: 1px solid var(--info-border); background-color: #ffffff; text-align: left; font-weight: bold; font-size: 0.85em; color: var(--dark-accent); padding: 2px 15px 4px 15px;">* Nota: O % informado é a cota parte da cessão de crédito.</td></tr>`;
        html += getGroupFooterHtml();
    }
    globalLiberado += subLibCessionarios;
    globalRetido += subRetCessionarios;
    
    if (incluirFgtsCes) {
        const fractionCes = baseCalculoCessionario > 0 ? Math.min(1, totalCessionariosBruto / baseCalculoCessionario) : 0;
        const consumidoDoCash = baseHerdeirosCessionarios * fractionCes;
        baseHerdeirosCessionarios -= consumidoDoCash;
        cashRestante -= consumidoDoCash;
        fgtsRestante -= fgts * fractionCes;
    } else {
        baseHerdeirosCessionarios -= totalCessionariosBruto;
        cashRestante -= totalCessionariosBruto;
    }
    cashRestante = Math.max(0, cashRestante);
    baseHerdeirosCessionarios = Math.max(0, baseHerdeirosCessionarios);

    // 2. Reclamante / Herdeiros
    const optFgtsHer = document.querySelector('input[name="incluir-fgts-base-her"][value="sim"]');
    const incluirFgtsHer = optFgtsHer ? optFgtsHer.checked : false;
    const baseCalculoReclamante = baseHerdeirosCessionarios + (incluirFgtsHer ? fgtsRestante : 0);

    let subLibHerdeiros = 0;
    let subRetHerdeiros = 0;
    let herdeirosExistem = false;
    let totalHerdeirosBruto = 0;
    let visHer = 1;
    let headerHerdeirosAdded = false;
    let hasAdvHerdeiro = false;

    for (let i = 1; i <= herdeiroCount; i++) {
        const nomeInput = document.getElementById(`her-nome-${i}`);
        if (nomeInput) {
            herdeirosExistem = true;
            const nomeHerdeiro = nomeInput.value || `Herdeiro ${visHer}`;
            let valorHerdeiro = 0;
            const elHerPerc = document.getElementById(`her-percentual-${i}`);
            const percHerStr = (elHerPerc && elHerPerc.value) ? elHerPerc.value.trim() : '';
            let percDisplay = '';
            let fractionHer = 0;
            
            if (percHerStr && percHerStr !== '') {
                const percentual = getNumericValue(`her-percentual-${i}`);
                valorHerdeiro = (percentual / 100) * baseCalculoReclamante;
                fractionHer = percentual / 100;
                percDisplay = percentual.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';
            } else {
                valorHerdeiro = getNumericValue(`her-resultado-${i}`);
                if (baseCalculoReclamante > 0) {
                    fractionHer = valorHerdeiro / baseCalculoReclamante;
                    let p = fractionHer * 100;
                    percDisplay = p.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';
                }
            }
            const retencao = getNumericValue(`her-retencao-${i}`);
            totalHerdeirosBruto += valorHerdeiro;

            const baseAdvHer = baseCalculoAdvogadosPrincipal * fractionHer;

            if (!headerHerdeirosAdded && (valorHerdeiro > 0)) {
                addGroupHeader('Crédito de Herdeiros');
                headerHerdeirosAdded = true;
            }

            let honorariosAdvTotalBruto = 0;
            const optHerAdvPerc = document.getElementById(`her-adv-opt-perc-${i}`);
            const isPercGlobal = optHerAdvPerc ? optHerAdvPerc.checked : false;
            if (isPercGlobal) {
                honorariosAdvTotalBruto = baseAdvHer * (getNumericValue(`her-adv-perc-global-${i}`) / 100);
            } else {
                honorariosAdvTotalBruto = getNumericValue(`her-adv-fix-global-${i}`);
            }
            honorariosAdvTotalBruto = Math.min(honorariosAdvTotalBruto, valorHerdeiro);

            let honorariosAdvTotal = 0;
            const advogados = document.querySelectorAll(`.adv-herdeiro-${i}`);

            advogados.forEach(advBlock => {
                const advId = advBlock.dataset.advId;
                let honorariosAdv = 0;
                const elHerAdvPart = document.getElementById(`her-adv-part-${advId}`);
                const partAdvStr = (elHerAdvPart && elHerAdvPart.value) ? elHerAdvPart.value.trim() : '';
                if (partAdvStr && partAdvStr !== '') {
                    const partAdv = getNumericValue(`her-adv-part-${advId}`) / 100;
                    honorariosAdv = honorariosAdvTotalBruto * partAdv;
                    honorariosAdv = Math.min(honorariosAdv, honorariosAdvTotalBruto);
                } else {
                    honorariosAdv = getNumericValue(`her-adv-resultado-${advId}`);
                }

                let irAdv = getNumericValue(`her-adv-ir-${advId}`);
                let retAdv = getNumericValue(`her-adv-ret-${advId}`);
                let liquidoAdv = Math.max(0, honorariosAdv - irAdv - retAdv);
                const elHerAdvNome = document.getElementById(`her-adv-nome-${advId}`);
                let nomeAdv = elHerAdvNome ? elHerAdvNome.value : '';
                const elHerAdvCpf = document.getElementById(`her-adv-cpf-${advId}`);
                let cpfAdv = elHerAdvCpf ? elHerAdvCpf.value : '';

                honorariosAdvTotal += honorariosAdv;

                if (honorariosAdv > 0) {
                    hasAdvHerdeiro = true;
                    if (liquidoAdv > 0) {
                        let percDisplay = '';
                        if (baseAdvHer > 0) {
                            let p = (honorariosAdv / baseAdvHer) * 100;
                            percDisplay = p.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';
                        }
                        let nomeAdvFinal = `<strong>${nomeAdv || `Advogado`}</strong>`;
                        if (percDisplay) {
                            nomeAdvFinal += ` <span style="font-size: 0.85em; font-weight: normal; color: #555;">(${percDisplay})</span>`;
                        }
                        addAdvogadoRow(nomeAdvFinal, cpfAdv, liquidoAdv);
                        subLibAdvogados += liquidoAdv;
                    }
                    if (retAdv > 0) {
                        const elHerAdvRetMotivo = document.getElementById(`her-adv-ret-motivo-${advId}`);
                        const motivoAdv = elHerAdvRetMotivo ? elHerAdvRetMotivo.value : '';
                        const nomeParaRetencao = nomeAdv || `Advogado (Herdeiro ${visHer})`;
                        const labelRetencao = motivoAdv ? `<strong>Retenção</strong> - ${nomeParaRetencao} (${motivoAdv})` : `<strong>Retenção</strong> - ${nomeParaRetencao}`;
                        advogadosRetencoes.push({ label: labelRetencao, valor: retAdv });
                        subRetAdvogados += retAdv;
                    }
                    if (irAdv > 0) {
                        irrfAdvogados.push({ nome: nomeAdv || `Advogado`, valor: irAdv });
                    }
                }
            });

            const liquidoHerdeiro = Math.max(0, valorHerdeiro - retencao - honorariosAdvTotal);

            if (valorHerdeiro > 0) {
                if (liquidoHerdeiro > 0) {
                    const elHerCpf = document.getElementById(`her-cpf-${i}`);
                    let nomeComPerc = `<strong>${nomeInput.value || `Herdeiro ${visHer}`}</strong>`;
                    if (percDisplay) {
                        nomeComPerc += ` <span style="font-size: 0.85em; font-weight: normal; color: #555;">(${percDisplay})</span>`;
                    }
                    addRow(
                        nomeComPerc,
                        elHerCpf ? elHerCpf.value : '',
                        liquidoHerdeiro
                    );
                    subLibHerdeiros += liquidoHerdeiro;
                }

                if (retencao > 0) {
                    const elHerRetMotivo = document.getElementById(`her-retencao-motivo-${i}`);
                    const motivo = elHerRetMotivo ? elHerRetMotivo.value : '';
                    const nomeParaRetencao = nomeInput.value || `Herdeiro ${visHer}`;
                    const labelRetencao = motivo ? `<strong>Retenção</strong> - ${nomeParaRetencao} (${motivo})` : `<strong>Retenção</strong> - ${nomeParaRetencao}`;
                    herdeirosRetencoes.push({ label: labelRetencao, valor: retencao });
                    subRetHerdeiros += retencao;
                }
            }
            visHer++;
        }
    }
    if (headerHerdeirosAdded) {
        if (herdeirosRetencoes.length > 0) {
            herdeirosRetencoes.forEach(ret => {
                addRow(ret.label, 'Retenção', ret.valor, 'linha-retencao');
            });
        }
        html += `<tr><td colspan="3" style="border-left: 1px solid var(--info-border); border-right: 1px solid var(--info-border); background-color: #ffffff; text-align: left; font-weight: bold; font-size: 0.85em; color: var(--dark-accent); padding: 2px 15px 4px 15px;">* Nota: O % informado é a cota parte da herança.</td></tr>`;
        html += getGroupFooterHtml();
    }
    globalLiberado += subLibHerdeiros;
    globalRetido += subRetHerdeiros;
    
    if (incluirFgtsHer) {
        const fractionHer = baseCalculoReclamante > 0 ? Math.min(1, totalHerdeirosBruto / baseCalculoReclamante) : 0;
        cashRestante -= baseHerdeirosCessionarios * fractionHer;
        fgtsRestante -= fgtsRestante * fractionHer;
    } else {
        cashRestante -= totalHerdeirosBruto;
    }
    cashRestante = Math.max(0, cashRestante);

    let subLibReclamante = 0;
    let subRetReclamante = 0;

    const saldoLiquidoReclamante = Math.max(0, cashRestante - valorDeducaoHonorarios);

    const hasReclamanteRows = saldoLiquidoReclamante > 0.005 || pensao > 0 || outras > 0 || fgtsRestante > 0.005;
    if (hasReclamanteRows) {
        addGroupHeader('Crédito do Reclamante');
    }

    if (saldoLiquidoReclamante > 0.005) {
        const elReclamante = document.getElementById('reclamante');
        const reclamanteNome = elReclamante ? elReclamante.value : '';
        const elCpf = document.getElementById('cpf');
        const cpfReclamante = elCpf ? elCpf.value : '';
        addRow(
            (herdeirosExistem || cessionarioCount > 0) ? `<strong>${reclamanteNome}</strong> (saldo)` : `<strong>${reclamanteNome}</strong>`,
            cpfReclamante,
            saldoLiquidoReclamante
        );
        subLibReclamante += saldoLiquidoReclamante;
    }

    if (pensao > 0) {
        const elPensaoBen = document.getElementById('pensao-beneficiario');
        const nomeBeneficiario = elPensaoBen ? elPensaoBen.value : '';
        const elPensaoCpf = document.getElementById('pensao-cpf');
        const cpfBeneficiario = elPensaoCpf ? elPensaoCpf.value : '';
        const labelPensao = nomeBeneficiario ? `<strong>Pensão Alimentícia</strong> (<strong>${nomeBeneficiario}</strong>)` : '<strong>Pensão Alimentícia</strong>';
        addRow(labelPensao, cpfBeneficiario || '', pensao);
        subLibReclamante += pensao;
    }
    if (outras > 0) {
        const elOutrasMotivo = document.getElementById('outras-motivo');
        const motivo = elOutrasMotivo ? elOutrasMotivo.value : '';
        const labelOutras = motivo ? `<strong>Retenção</strong> (${motivo})` : `<strong>Retenção</strong>`;
        reclamanteRetencoes.push({ label: labelOutras, valor: outras });
        subRetReclamante += outras;
    }

    if (fgtsRestante > 0.005) {
        addRow('<strong>FGTS a Depositar</strong>', 'Depósito CEF', fgtsRestante, '');
        subLibReclamante += fgtsRestante;
    }
    if (hasReclamanteRows) {
        if (reclamanteRetencoes.length > 0) {
            reclamanteRetencoes.forEach(ret => {
                addRow(ret.label, 'Retenção', ret.valor, 'linha-retencao');
            });
        }
        html += getGroupFooterHtml();
    }
    globalLiberado += subLibReclamante;
    globalRetido += subRetReclamante;

    // 3. Advogados
    const valorPrincipalAdv = getNumericValue('adv-principal-resultado');
    let hasContratualAba = false;

    if (valorPrincipalAdv > 0) {
        hasContratualAba = true;
        const irPrincipal = getNumericValue('adv-principal-ir');
        const retPrincipal = getNumericValue('adv-principal-retencao');
        const liquidoPrincipal = Math.max(0, valorPrincipalAdv - irPrincipal - retPrincipal);

        const elAdvNomePrinc = document.getElementById('adv-nome-principal');
        const advNomePrinc = elAdvNomePrinc ? elAdvNomePrinc.value : '';
        const elAdvCpfPrinc = document.getElementById('adv-cpf-principal');
        const advCpfPrinc = elAdvCpfPrinc ? elAdvCpfPrinc.value : '';
        
        let percDisplay = '';
        if (baseCalculoAdvogadosPrincipal > 0) {
            let p = (valorPrincipalAdv / baseCalculoAdvogadosPrincipal) * 100;
            percDisplay = p.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';
        }
        let nomePrincipalFinal = `<strong>${advNomePrinc || 'Advogado (a) 1'}</strong>`;
        if (percDisplay) {
            nomePrincipalFinal += ` <span style="font-size: 0.85em; font-weight: normal; color: #555;">(${percDisplay})</span>`;
        }
        
        addAdvogadoRow(
            nomePrincipalFinal,
            advCpfPrinc,
            liquidoPrincipal
        );
        subLibAdvogados += liquidoPrincipal;

        if (retPrincipal > 0) {
            const elAdvRetMotivoPrinc = document.getElementById('adv-principal-retencao-motivo');
            const motivoRetPrincipal = elAdvRetMotivoPrinc ? elAdvRetMotivoPrinc.value : '';
            const nomeParaRetencao = advNomePrinc || 'Advogado (a) 1';
            const labelRetencao = motivoRetPrincipal ? `<strong>Retenção</strong> - ${nomeParaRetencao} (${motivoRetPrincipal})` : `<strong>Retenção</strong> - ${nomeParaRetencao}`;
            advogadosRetencoes.push({ label: labelRetencao, valor: retPrincipal });
            subRetAdvogados += retPrincipal;
        }
        if (irPrincipal > 0) {
            irrfAdvogados.push({ nome: advNomePrinc || 'Advogado 1', valor: irPrincipal });
        }
    }

    let visAdvAd = 1;
    for (let i = 1; i <= advogadoAdicionalCount; i++) {
        const nomeInput = document.getElementById(`adv-ad-nome-${i}`);
        if (!nomeInput) continue;
        const irAdicional = getNumericValue(`adv-ad-ir-${i}`);
        const retAdicional = getNumericValue(`adv-ad-retencao-${i}`);
        const valorCalculado = getNumericValue(`adv-ad-resultado-${i}`);
        const liquidoCalculado = Math.max(0, valorCalculado - irAdicional - retAdicional);

        if (valorCalculado > 0) {
            hasContratualAba = true;
            const elAdvCpfAd = document.getElementById(`adv-ad-cpf-${i}`);
            
            let percDisplay = '';
            if (baseCalculoAdvogadosPrincipal > 0) {
                let p = (valorCalculado / baseCalculoAdvogadosPrincipal) * 100;
                percDisplay = p.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';
            }
            let nomeAdicionalFinal = `<strong>${nomeInput.value || `Advogado (a) ${visAdvAd + 1}`}</strong>`;
            if (percDisplay) {
                nomeAdicionalFinal += ` <span style="font-size: 0.85em; font-weight: normal; color: #555;">(${percDisplay})</span>`;
            }
            
            addAdvogadoRow(
                nomeAdicionalFinal,
                elAdvCpfAd ? elAdvCpfAd.value : '',
                liquidoCalculado
            );
            subLibAdvogados += liquidoCalculado;
            if (retAdicional > 0) {
                const elMotivoRetAd = document.getElementById(`adv-ad-retencao-motivo-${i}`);
                const motivoRetAdicional = elMotivoRetAd ? elMotivoRetAd.value : '';
                const nomeParaRetencao = nomeInput.value || `Advogado (a) ${visAdvAd + 1}`;
                const labelRetencao = motivoRetAdicional ? `<strong>Retenção</strong> - ${nomeParaRetencao} (${motivoRetAdicional})` : `<strong>Retenção</strong> - ${nomeParaRetencao}`;
                advogadosRetencoes.push({ label: labelRetencao, valor: retAdicional });
                subRetAdvogados += retAdicional;
            }
            if (irAdicional > 0) {
                irrfAdvogados.push({ nome: nomeInput.value || `Advogado ${visAdvAd + 1}`, valor: irAdicional });
            }
        }
        visAdvAd++;
    }

    let hasSucumbenciaisAba = false;
    for (let i = 1; i <= advSucumbencialCount; i++) {
        const nomeInput = document.getElementById(`adv-suc-nome-${i}`);
        if (!nomeInput) continue;
        const irAdicional = getNumericValue(`adv-suc-ir-${i}`);
        const retAdicional = getNumericValue(`adv-suc-retencao-${i}`);
        const valorCalculado = getNumericValue(`adv-suc-resultado-${i}`);
        const liquidoCalculado = Math.max(0, valorCalculado - irAdicional - retAdicional);
        if (valorCalculado > 0) {
            hasSucumbenciaisAba = true;
            const elCpf = document.getElementById(`adv-suc-cpf-${i}`);
            
            let percDisplay = '';
            if (baseCalculoAdvogadosPrincipal > 0) {
                let p = (valorCalculado / baseCalculoAdvogadosPrincipal) * 100;
                percDisplay = p.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';
            }
            let nomeSucFinal = `<strong>${nomeInput.value || `Advogado(a) ${i}`}</strong>`;
            if (percDisplay) {
                nomeSucFinal += ` <span style="font-size: 0.85em; font-weight: normal; color: #555;">(${percDisplay})</span>`;
            }
            nomeSucFinal += ` <span style="font-size: 0.85em; font-weight: normal; color: #555;">(Sucumbencial)</span>`;
            
            advogadosRowsHtml += getRowHtml(nomeSucFinal, elCpf ? elCpf.value : '', liquidoCalculado);
            subLibAdvogados += liquidoCalculado;
            if (retAdicional > 0) {
                const elMotivo = document.getElementById(`adv-suc-retencao-motivo-${i}`);
                const motivo = elMotivo ? elMotivo.value : '';
                const nomeParaRetencao = nomeInput.value || `Advogado (a) ${i}`;
                const labelRetencao = motivo ? `<strong>Retenção</strong> - ${nomeParaRetencao} (${motivo})` : `<strong>Retenção</strong> - ${nomeParaRetencao}`;
                advogadosRetencoes.push({ label: labelRetencao, valor: retAdicional });
                subRetAdvogados += retAdicional;
            }
            if (irAdicional > 0) { irrfAdvogados.push({ nome: `${nomeInput.value || `Advogado(a) ${i}`}`, valor: irAdicional }); }
        }
    }

    let planHonNet = getNumericValue('input-honorarios-advocaticios');
    let planIrrfTotal = getNumericValue('input-irrf-honorarios');
    let tabsHonNet = 0;
    let tabsIrrfTotal = 0;

    const addContratualNet = (suffix) => {
        const resEl = document.getElementById(suffix === 'principal' ? 'adv-principal-resultado' : `adv-ad-resultado-${suffix}`);
        const irEl = document.getElementById(suffix === 'principal' ? 'adv-principal-ir' : `adv-ad-ir-${suffix}`);
        if (resEl) {
            let gross = getNumericValueFromInput(resEl);
            let ir = getNumericValueFromInput(irEl);
            if (gross > 0) {
                tabsHonNet += Math.max(0, gross - ir);
                tabsIrrfTotal += ir;
            }
        }
    };
    addContratualNet('principal');
    for (let i = 1; i <= advogadoAdicionalCount; i++) addContratualNet(i);

    for (let i = 1; i <= advSucumbencialCount; i++) {
        let gross = getNumericValue(`adv-suc-resultado-${i}`);
        let ir = getNumericValue(`adv-suc-ir-${i}`);
        if (gross > 0) {
            tabsHonNet += Math.max(0, gross - ir);
            tabsIrrfTotal += ir;
        }
    }

    let remainderNet = planHonNet - tabsHonNet;
    let remainderIrrf = planIrrfTotal - tabsIrrfTotal;

    if (remainderNet > 0.01 || remainderIrrf > 0.01) {
        if (remainderNet > 0.01) {
            advogadosRowsHtml += getRowHtml(`<strong>Honorários Advocatícios</strong> <span style="font-size: 0.85em; font-weight: normal; color: #555;">(Lançamento Direto Planilha)</span>`, '', remainderNet);
            subLibAdvogados += remainderNet;
        }
        if (remainderIrrf > 0.01) {
            irrfAdvogados.push({ nome: 'Advocatícios (Direto Planilha)', valor: remainderIrrf });
        }
    }

    if (advogadosRowsHtml !== '') {
        let tituloHon = 'Honorários Advocatícios';

        addGroupHeader(tituloHon);
        html += advogadosRowsHtml;
        if (advogadosRetencoes.length > 0) {
            advogadosRetencoes.forEach(ret => {
                html += getRowHtml(ret.label, 'Retenção', ret.valor, 'linha-retencao');
            });
        }

        if (honAdvTotal > 0) {
            html += `<tr><td colspan="3" style="border-left: 1px solid var(--info-border); border-right: 1px solid var(--info-border); background-color: #ffffff; text-align: left; font-weight: bold; font-size: 0.85em; color: var(--dark-accent); padding: 2px 15px 4px 15px;">* Nota: % dos Honorários Contratuais sobre o Bruto do Reclamante.</td></tr>`;
        }
        if (hasSucumbenciaisAba) {
            html += `<tr><td colspan="3" style="border-left: 1px solid var(--info-border); border-right: 1px solid var(--info-border); background-color: #ffffff; text-align: left; font-weight: bold; font-size: 0.85em; color: var(--dark-accent); padding: 2px 15px 8px 15px;">* Nota: % dos Honorários Sucumbenciais sobre o Bruto do Reclamante.</td></tr>`;
        }

        html += getGroupFooterHtml();
    }

    globalLiberado += subLibAdvogados;
    globalRetido += subRetAdvogados;

    // 3.5 Perito(a)
    let subLibPerito = 0;
    let subRetPerito = 0;
    let irrfPeritos = [];
    let peritosRowsHtml = '';
    let hasPeritosAba = false;

    const valorPrincipalPerito = getNumericValue('perito-principal-resultado');

    if (valorPrincipalPerito > 0) {
        hasPeritosAba = true;
        const irPrincipal = getNumericValue('perito-principal-ir');
        const retPrincipal = getNumericValue('perito-principal-retencao');
        const liquidoPrincipal = Math.max(0, valorPrincipalPerito - irPrincipal - retPrincipal);

        const elPerNomePrinc = document.getElementById('perito-nome-principal');
        const perNomePrinc = elPerNomePrinc ? elPerNomePrinc.value : '';
        const elPerCpfPrinc = document.getElementById('perito-cpf-principal');
        const perCpfPrinc = elPerCpfPrinc ? elPerCpfPrinc.value : '';
        peritosRowsHtml += getRowHtml(
            `<strong>${perNomePrinc || 'Perito(a) 1'}</strong>`,
            perCpfPrinc,
            liquidoPrincipal
        );
        subLibPerito += liquidoPrincipal;

        if (retPrincipal > 0) {
            const elPerRetMotivoPrinc = document.getElementById('perito-principal-retencao-motivo');
            const motivoRetPrincipal = elPerRetMotivoPrinc ? elPerRetMotivoPrinc.value : '';
            const nomeParaRetencao = perNomePrinc || 'Perito (a) 1';
            const labelRetencao = motivoRetPrincipal ? `<strong>Retenção</strong> - ${nomeParaRetencao} (${motivoRetPrincipal})` : `<strong>Retenção</strong> - ${nomeParaRetencao}`;
            peritosRetencoes.push({ label: labelRetencao, valor: retPrincipal });
            subRetPerito += retPrincipal;
        }
        if (irPrincipal > 0) {
            irrfPeritos.push({ nome: perNomePrinc || 'Perito 1', valor: irPrincipal });
        }
    }

    let visPeritoAd = 1;
    for (let i = 1; i <= peritoAdicionalCount; i++) {
        const nomeInput = document.getElementById(`perito-ad-nome-${i}`);
        if (!nomeInput) continue;

        const valorCalculado = getNumericValue(`perito-ad-resultado-${i}`);
        const irAdicional = getNumericValue(`perito-ad-ir-${i}`);
        const retAdicional = getNumericValue(`perito-ad-retencao-${i}`);
        const liquidoCalculado = Math.max(0, valorCalculado - irAdicional - retAdicional);

        if (valorCalculado > 0) {
            hasPeritosAba = true;
            const elPerCpfAd = document.getElementById(`perito-ad-cpf-${i}`);
            peritosRowsHtml += getRowHtml(
                `<strong>${nomeInput.value || `Perito(a) ${visPeritoAd + 1}`}</strong>`,
                elPerCpfAd ? elPerCpfAd.value : '',
                liquidoCalculado
            );
            subLibPerito += liquidoCalculado;

            if (retAdicional > 0) {
                const elPerMotivoRetAd = document.getElementById(`perito-ad-retencao-motivo-${i}`);
                const motivoRetAdicional = elPerMotivoRetAd ? elPerMotivoRetAd.value : '';
                const nomeParaRetencao = nomeInput.value || `Perito (a) ${visPeritoAd + 1}`;
                const labelRetencao = motivoRetAdicional ? `<strong>Retenção</strong> - ${nomeParaRetencao} (${motivoRetAdicional})` : `<strong>Retenção</strong> - ${nomeParaRetencao}`;
                peritosRetencoes.push({ label: labelRetencao, valor: retAdicional });
                subRetPerito += retAdicional;
            }
            if (irAdicional > 0) {
                irrfPeritos.push({ nome: nomeInput.value || `Perito ${visPeritoAd + 1}`, valor: irAdicional });
            }
        }
        visPeritoAd++;
    }

    if (!hasPeritosAba) {
        const manualPerHon = getNumericValue('input-honorarios-periciais');
        const manualPerIrrf = getNumericValue('input-irrf-periciais');
        if (manualPerHon > 0 || manualPerIrrf > 0) {
            peritosRowsHtml += getRowHtml(`<strong>Honorários Periciais</strong> <span style="font-size: 0.85em; font-weight: normal; color: #555;">(Lançamento Direto Planilha)</span>`, '', manualPerHon);
            subLibPerito += manualPerHon;
            if (manualPerIrrf > 0) {
                irrfPeritos.push({ nome: 'Peritos', valor: manualPerIrrf });
            }
        }
    }

    if (peritosRowsHtml !== '') {
        addGroupHeader('Honorários Periciais');
        html += peritosRowsHtml;
        if (peritosRetencoes.length > 0) {
            peritosRetencoes.forEach(ret => {
                html += getRowHtml(ret.label, 'Retenção', ret.valor, 'linha-retencao');
            });
        }
        html += getGroupFooterHtml();
    }

    globalLiberado += subLibPerito;
    globalRetido += subRetPerito;

    // 4. Recolhimentos (Gerais)
    let subTotalRecolhimentos = 0;
    
    const inssRec = getNumericValue('inss-reclamante');
    const inssReclamadaVal = getNumericValue('inss-reclamada');
    const totalIrrfAdvs = irrfAdvogados.reduce((acc, curr) => acc + curr.valor, 0);
    const totalIrrfPers = irrfPeritos.reduce((acc, curr) => acc + curr.valor, 0);

    if ((inssRec + inssReclamadaVal + irValor + custas + totalIrrfAdvs + totalIrrfPers) > 0.005) {
        addGroupHeader('Tributos');
    }

    if (inssRec > 0) { addRow('<strong>INSS Reclamante</strong>', 'Recolhimento', inssRec); subTotalRecolhimentos += inssRec; }
    if (inssReclamadaVal > 0) { addRow('<strong>INSS Executada</strong>', 'Recolhimento', inssReclamadaVal); subTotalRecolhimentos += inssReclamadaVal; }
    if (irValor > 0) { addRow('<strong>IRRF Reclamante</strong>', 'Recolhimento', irValor); subTotalRecolhimentos += irValor; }

    irrfAdvogados.forEach(item => {
        addRow(`<strong>IRRF (Adv. ${item.nome})</strong>`, 'Recolhimento', item.valor);
        subTotalRecolhimentos += item.valor;
    });

    irrfPeritos.forEach(item => {
        addRow(`<strong>IRRF (Perito ${item.nome})</strong>`, 'Recolhimento', item.valor);
        subTotalRecolhimentos += item.valor;
    });

    if (custas > 0) {
        addRow('<strong>Custas Judiciais</strong>', 'Recolhimento', custas);
        subTotalRecolhimentos += custas;
    }

    if ((inssRec + inssReclamadaVal + irValor + custas + totalIrrfAdvs + totalIrrfPers) > 0.005) {
        html += getGroupFooterHtml();
    }
    globalRecolher += subTotalRecolhimentos;

    // 5. Previdência Privada
    if (previdencia > 0.005) {
        const fundoPrevidencia = extrairValorSeguro('nome-fundo-previdencia');
        const cnpjFundo = extrairValorSeguro('cnpj-fundo-previdencia');
        addGroupHeader('Previdência Privada');
        addRow(`<strong>${fundoPrevidencia || 'Fundo de Previdência'}</strong>`, cnpjFundo || 'Depósito / Transferência', previdencia);
        html += getGroupFooterHtml();
        globalLiberado += previdencia;
    }

    html += `<tr class="spacer-row"><td colspan="3" style="height: 20px; border: none; background: transparent; padding: 0;"></td></tr>`;
    tbody.innerHTML = html;

    // Total footer
    const valorBrutoTotal = getNumericValue('valor-bruto-reclamante');
    const valorDeposito = getNumericValue('valor-deposito');
    const diferenca = valorDeposito - (globalLiberado + globalRetido + globalRecolher);

    const footerItems = [];
    if (globalLiberado > 0.005) footerItems.push({ label: '(+) TOTAL A LIBERAR (LÍQUIDO)', val: globalLiberado, font: '1em', labelFont: '0.9em', color: '#004085', pt: '12px', pb: '4px', isDashed: true });
    if (globalRetido > 0.005) footerItems.push({ label: '(+) TOTAL RETIDO', val: globalRetido, font: '1em', labelFont: '0.9em', color: '#856404', pt: '4px', pb: '4px', isDashed: false });
    if (globalRecolher > 0.005) footerItems.push({ label: '(+) TOTAL A RECOLHER (TRIBUTOS)', val: globalRecolher, font: '1em', labelFont: '0.9em', color: '#155724', pt: '4px', pb: '15px', isDashed: false });

    let tfootHtml = '';
    footerItems.forEach((item, index) => {
        const isFirst = index === 0;
        const isLast = (index === footerItems.length - 1) && (Math.abs(diferenca) <= 0.005);
        let borderTop = isFirst ? '2px solid var(--primary-color)' : (item.isDashed ? '1px dashed #ccc' : 'none');
        let borderBottom = isLast ? '1px solid var(--info-border)' : 'none';
        let radiusC1 = `${isFirst ? '8px' : '0'} 0 0 ${isLast ? '8px' : '0'}`;
        let radiusC2 = `0 ${isFirst ? '8px' : '0'} ${isLast ? '8px' : '0'} 0`;
        let pt = isFirst && item.pt !== '15px' ? '15px' : item.pt;
        let pb = isLast ? '15px' : item.pb;
        tfootHtml += `
                <tr style="background-color: #F8F9FA;">
                    <td colspan="2" style="border-left: 1px solid var(--info-border); border-top: ${borderTop}; border-bottom: ${borderBottom}; border-radius: ${radiusC1}; font-size: ${item.labelFont}; font-weight: bold; color: ${item.color}; text-align: right; padding-right: 15px; padding-top: ${pt}; padding-bottom: ${pb};">${item.label}</td>
                    <td class="value-col" style="border-right: 1px solid var(--info-border); border-top: ${borderTop}; border-bottom: ${borderBottom}; border-radius: ${radiusC2}; font-size: ${item.font}; font-weight: bold; color: ${item.color}; text-align: right; padding-top: ${pt}; padding-bottom: ${pb};">${formatarMoedaParaExibicao(item.val)}</td>
                </tr>`;
    });

    if (Math.abs(diferenca) > 0.005) {
        tfootHtml += `
                <tr style="background-color: #F8F9FA;">
                    <td colspan="2" style="border-left: 1px solid var(--info-border); border-top: 1px dashed #ccc; border-bottom: 1px solid var(--info-border); border-radius: 0 0 0 8px; font-size: 0.9em; font-weight: bold; color: red; text-align: right; padding-right: 15px; padding-top: 12px; padding-bottom: 15px;">DIFERENÇA (DEPOSITADO - DEVIDO)</td>
                    <td id="diferenca-valor" class="value-col" style="border-right: 1px solid var(--info-border); border-top: 1px dashed #ccc; border-bottom: 1px solid var(--info-border); border-radius: 0 0 8px 0; font-size: 1em; font-weight: bold; color: red; text-align: right; padding-top: 12px; padding-bottom: 15px;">${formatarMoedaParaExibicao(diferenca)}</td>
                </tr>`;
    } else {
        tfootHtml += `
                <tr style="display: none;">
                    <td colspan="2">DIFERENÇA (DEPOSITADO - DEVIDO)</td>
                    <td id="diferenca-valor" class="value-col" style="text-align: right; color: ${Math.abs(diferenca) > 0.005 ? 'red' : 'black'};">${formatarMoedaParaExibicao(diferenca)}</td>
                    <td id="diferenca-valor" class="value-col" style="text-align: right; color: black;">0,00</td>
                </tr>`;
    }
    tfoot.innerHTML = tfootHtml;
}

// =======================================================================
// LÓGICA DE LIMPEZA DE BLOCOS VAZIOS ANTES DA VALIDAÇÃO
// =======================================================================
function removerBlocosVazios() {
    const removeSeVazio = (prefixo, countGlobal, sufixoParte, campos, funcRemocao) => {
        for (let i = 1; i <= window[countGlobal]; i++) {
            const idBloco = `${sufixoParte}-${i}`;
            const bloco = document.getElementById(idBloco);
            if (bloco) {
                let vazio = true;
                campos.forEach(campo => {
                    const elId = `${prefixo}-${campo}-${i}`;
                    const val = extrairValorSeguro(elId);
                    if (val !== '' && val !== '0,00' && val !== '0' && val !== '0,00%') {
                        vazio = false;
                    }
                });
                
                if (vazio && (sufixoParte === 'herdeiro' || sufixoParte === 'cessionario')) {
                    const advs = document.querySelectorAll(`.adv-${sufixoParte}-${i}`);
                    if (advs.length > 0) {
                        vazio = false;
                    }
                }

                if (vazio) {
                    if (funcRemocao) {
                        funcRemocao(i);
                    } else {
                        removerParte(idBloco, true);
                    }
                }
            }
        }
    };

    for (let i = 1; i <= window.herdeiroCount; i++) {
        const advs = document.querySelectorAll(`.adv-herdeiro-${i}`);
        advs.forEach(advBlock => {
            const advId = advBlock.dataset.advId;
            const nome = extrairValorSeguro(`her-adv-nome-${advId}`);
            const cpf = extrairValorSeguro(`her-adv-cpf-${advId}`);
            const part = extrairValorSeguro(`her-adv-part-${advId}`);
            const res = extrairValorSeguro(`her-adv-resultado-${advId}`);
            if (!nome && !cpf && (!part || part === '0,00%') && (res === '' || res === '0,00' || res === '0')) {
                removerAdvogadoHerdeiro(advId, i);
            }
        });
    }

    for (let i = 1; i <= window.cessionarioCount; i++) {
        const advs = document.querySelectorAll(`.adv-cessionario-${i}`);
        advs.forEach(advBlock => {
            const advId = advBlock.dataset.advId;
            const nome = extrairValorSeguro(`ces-adv-nome-${advId}`);
            const cpf = extrairValorSeguro(`ces-adv-cpf-${advId}`);
            const part = extrairValorSeguro(`ces-adv-part-${advId}`);
            const res = extrairValorSeguro(`ces-adv-resultado-${advId}`);
            if (!nome && !cpf && (!part || part === '0,00%') && (res === '' || res === '0,00' || res === '0')) {
                removerAdvogadoCessionario(advId, i);
            }
        });
    }

    removeSeVazio('adv-ad', 'advogadoAdicionalCount', 'adv-adicional', ['nome', 'cpf', 'percentual', 'resultado']);
    removeSeVazio('adv-suc', 'advSucumbencialCount', 'adv-sucumbencial', ['nome', 'cpf', 'resultado']);
    removeSeVazio('perito-ad', 'peritoAdicionalCount', 'perito-adicional', ['nome', 'cpf', 'resultado']);
    removeSeVazio('her', 'herdeiroCount', 'herdeiro', ['nome', 'cpf', 'percentual', 'resultado']);
    removeSeVazio('ces', 'cessionarioCount', 'cessionario', ['nome', 'cpf', 'percentual', 'resultado']);
}

function validarFormulario() {
    removerBlocosVazios();
    atualizarQuadroResumo();
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    let camposFaltantes = [];
    let mensagensEspecificas = [];

    const camposPrincipais = [
        { id: 'proc-num', nome: 'Número do Processo' },
        { id: 'reclamante', nome: 'Reclamante' },
        { id: 'cpf', nome: 'CPF/CNPJ do Reclamante' },
        { id: 'valor-deposito', nome: 'Valor do Depósito Bancário' },
        { id: 'id-deposito', nome: 'ID do Depósito Bancário' },
        { id: 'conta-judicial', nome: 'Conta Judicial' },
        { id: 'id-planilha', nome: 'ID da Planilha' },
        { id: 'nome-servidor', nome: 'Servidor Responsável' }
    ];
    camposPrincipais.forEach(campo => {
        const val = extrairValorSeguro(campo.id);
        const el = document.getElementById(campo.id);
        if (val === '') {
            camposFaltantes.push(campo.nome);
            if (el) el.classList.add('input-error');
        } else if (campo.id === 'valor-deposito' && getNumericValue(campo.id) === 0) {
            camposFaltantes.push(campo.nome);
            if (el) el.classList.add('input-error');
        }
    });
    
    const fgtsValidar = getNumericValue('fgts-viculada');
    if (fgtsValidar > 0) {
        const honAdvTotal = getNumericValue('adv-resultado');
        const elAdvPercOpt = document.getElementById('adv-percentual-opt');
        const isAdvPercentual = elAdvPercOpt ? elAdvPercOpt.checked : false;
        if (honAdvTotal > 0 && isAdvPercentual) {
            const fgtsSim = document.querySelector('input[name="incluir-fgts-base"][value="sim"]');
            const fgtsNao = document.querySelector('input[name="incluir-fgts-base"][value="nao"]');
            if ((!fgtsSim || !fgtsSim.checked) && (!fgtsNao || !fgtsNao.checked)) {
                camposFaltantes.push('Deseja adicionar o valor do FGTS à Base de Cálculo? (Aba Advogados)');
                const container = document.getElementById('container-fgts-base-adv');
                if (container) container.classList.add('input-error');
            }
        }
        
        if (herdeiroCount > 0) {
            const fgtsSimHer = document.querySelector('input[name="incluir-fgts-base-her"][value="sim"]');
            const fgtsNaoHer = document.querySelector('input[name="incluir-fgts-base-her"][value="nao"]');
            if ((!fgtsSimHer || !fgtsSimHer.checked) && (!fgtsNaoHer || !fgtsNaoHer.checked)) {
                camposFaltantes.push('Deseja adicionar o valor do FGTS à Base de Cálculo? (Aba Herdeiros)');
                const container = document.getElementById('container-fgts-base-her');
                if (container) container.classList.add('input-error');
            }
        }
        
        if (cessionarioCount > 0) {
            const fgtsSimCes = document.querySelector('input[name="incluir-fgts-base-ces"][value="sim"]');
            const fgtsNaoCes = document.querySelector('input[name="incluir-fgts-base-ces"][value="nao"]');
            if ((!fgtsSimCes || !fgtsSimCes.checked) && (!fgtsNaoCes || !fgtsNaoCes.checked)) {
                camposFaltantes.push('Deseja adicionar o valor do FGTS à Base de Cálculo? (Aba Cessionários)');
                const container = document.getElementById('container-fgts-base-ces');
                if (container) container.classList.add('input-error');
            }
        }
    }

    const previdenciaValidar = getNumericValue('valor-previdencia-privada');
    const nomeFundo = extrairValorSeguro('nome-fundo-previdencia');
    const cnpjFundo = extrairValorSeguro('cnpj-fundo-previdencia');
    
    if (previdenciaValidar > 0) {
        if (nomeFundo === '') {
            camposFaltantes.push('Nome do Fundo de Previdência');
            const el = document.getElementById('nome-fundo-previdencia');
            if (el) el.classList.add('input-error');
        }
        if (cnpjFundo === '') {
            camposFaltantes.push('CNPJ do Fundo de Previdência');
            const el = document.getElementById('cnpj-fundo-previdencia');
            if (el) el.classList.add('input-error');
        }
    } else if ((nomeFundo !== '' || cnpjFundo !== '') && previdenciaValidar <= 0) {
        camposFaltantes.push('Valor da Previdência Privada');
        const el = document.getElementById('valor-previdencia-privada');
        if (el) el.classList.add('input-error');
    }

    const honAdvTotal = getNumericValue('adv-resultado');

    if (honAdvTotal > 0) {
        const advCamposPrincipais = [
            { id: 'adv-nome-principal', nome: 'Nome do Advogado (a) 1' },
            { id: 'adv-cpf-principal', nome: 'CPF/CNPJ do Advogado (a) 1' },
            { id: 'adv-principal-liquido', nome: 'Honorários Líquido a Liberar do Advogado (a) 1', isNumeric: true }
        ];
        advCamposPrincipais.push({ id: 'adv-principal-resultado', nome: 'Honorários (R$) do Advogado (a) 1' });

        advCamposPrincipais.forEach(campo => {
            const val = extrairValorSeguro(campo.id);
            const el = document.getElementById(campo.id);
            if (val === '' || (campo.isNumeric && getNumericValue(campo.id) <= 0)) {
                camposFaltantes.push(campo.nome);
                if (el) {
                    el.classList.add('input-error');
                    const details = el.closest('details');
                    if (details) {
                        details.open = true;
                        if (details.style.display === 'none') details.style.display = 'block';
                    }
                }
            }
        });

        for (let i = 1; i <= advogadoAdicionalCount; i++) {
            if (document.getElementById(`adv-adicional-${i}`)) {
                const advCamposAdicionais = [
                    { id: `adv-ad-nome-${i}`, nome: `Nome do Advogado (a) ${i + 1}` },
                    { id: `adv-ad-cpf-${i}`, nome: `CPF/CNPJ do Advogado (a) ${i + 1}` },
                    { id: `adv-ad-liquido-${i}`, nome: `Honorários Líquido a Liberar do Advogado (a) ${i + 1}`, isNumeric: true }
                ];
                advCamposAdicionais.push({ id: `adv-ad-resultado-${i}`, nome: `Honorários (R$) do Advogado (a) ${i + 1}` });

                advCamposAdicionais.forEach(campo => {
                    const val = extrairValorSeguro(campo.id);
                    const el = document.getElementById(campo.id);
                    if (val === '' || (campo.isNumeric && getNumericValue(campo.id) <= 0)) {
                        camposFaltantes.push(campo.nome);
                        if (el) {
                            el.classList.add('input-error');
                            const details = el.closest('details');
                            if (details) {
                                details.open = true;
                                if (details.style.display === 'none') details.style.display = 'block';
                            }
                        }
                    }
                });
            }
        }
    }

    if (advSucumbencialCount > 0) {
        for (let i = 1; i <= advSucumbencialCount; i++) {
            if (document.getElementById(`adv-sucumbencial-${i}`)) {
                const sucCamposAdicionais = [
                    { id: `adv-suc-nome-${i}`, nome: `Nome do Advogado (Sucumbencial) ${i}` },
                    { id: `adv-suc-cpf-${i}`, nome: `CPF/CNPJ do Advogado (Sucumbencial) ${i}` },
                    { id: `adv-suc-resultado-${i}`, nome: `Honorários (R$) do Advogado (Sucumbencial) ${i}` }
                ];
                sucCamposAdicionais.forEach(campo => {
                    if (extrairValorSeguro(campo.id) === '') {
                        camposFaltantes.push(campo.nome);
                        const el = document.getElementById(campo.id);
                        if (el) { el.classList.add('input-error'); const details = el.closest('details'); if (details) details.open = true; }
                    }
                });
            }
        }
    }

    const honPeritoTotal = getNumericValue('input-honorarios-periciais');
    if (honPeritoTotal > 0) {
        const peritoCamposPrincipais = [
            { id: 'perito-nome-principal', nome: 'Nome do Perito (a) 1' },
            { id: 'perito-cpf-principal', nome: 'CPF/CNPJ do Perito (a) 1' },
            { id: 'perito-principal-resultado', nome: 'Honorários (R$) do Perito (a) 1' }
        ];
        peritoCamposPrincipais.forEach(campo => {
            const val = extrairValorSeguro(campo.id);
            const el = document.getElementById(campo.id);
            if (val === '') {
                camposFaltantes.push(campo.nome);
                if (el) {
                    el.classList.add('input-error');
                    const details = el.closest('details');
                    if (details) {
                        details.open = true;
                        if (details.style.display === 'none') details.style.display = 'block';
                    }
                }
            }
        });
        for (let i = 1; i <= peritoAdicionalCount; i++) {
            if (document.getElementById(`perito-adicional-${i}`)) {
                const peritoCamposAdicionais = [
                    { id: `perito-ad-nome-${i}`, nome: `Nome do Perito (a) ${i + 1}` },
                    { id: `perito-ad-cpf-${i}`, nome: `CPF/CNPJ do Perito (a) ${i + 1}` },
                    { id: `perito-ad-resultado-${i}`, nome: `Honorários (R$) do Perito (a) ${i + 1}` }
                ];
                peritoCamposAdicionais.forEach(campo => {
                    const val = extrairValorSeguro(campo.id);
                    const el = document.getElementById(campo.id);
                    if (val === '') {
                        camposFaltantes.push(campo.nome);
                        if (el) {
                            el.classList.add('input-error');
                            const details = el.closest('details');
                            if (details) {
                                details.open = true;
                                if (details.style.display === 'none') details.style.display = 'block';
                            }
                        }
                    }
                });
            }
        }
    }

    const dinamicos = document.querySelectorAll('.required-dynamic');
    dinamicos.forEach(input => {
        const val = input.value !== undefined ? input.value : (input.textContent || '');
        
        if (input.id.includes('percentual-')) {
            const resId = input.id.replace('percentual-', 'resultado-');
            if (getNumericValue(resId) > 0) return;
        }
        if (input.id.includes('resultado-')) {
            const percId = input.id.replace('resultado-', 'percentual-');
            const percInput = document.getElementById(percId);
            if (percInput && percInput.value.trim() !== '') return;
        }
        if (input.id.includes('-part-')) {
            const resId = input.id.replace('-part-', '-resultado-');
            if (getNumericValue(resId) > 0) return;
        }

        if (val.toString().trim() === '') {
            let label = getFieldName(input);
            if (!label) {
                let labelElement;
                const fg = input.closest('.field-group');
                if (fg) labelElement = fg.querySelector('label');
                if (!labelElement) {
                    const flexBasis = input.closest('div[style*="flex-basis"]');
                    if (flexBasis) labelElement = flexBasis.querySelector('label');
                }
                label = labelElement ? labelElement.innerText.replace(':', '') : `Campo Obrigatório`;
            }
            camposFaltantes.push(label);
            input.classList.add('input-error');
            
            const tabPane = input.closest('.tab-pane');
            if (tabPane && tabPane.style.display === 'none') {
                const btn = document.querySelector(`.tab-button[onclick*="${tabPane.id}"]`);
                if (btn) btn.click();
            }
            const details = input.closest('details');
            if (details) {
                details.open = true;
                if (details.style.display === 'none') details.style.display = 'block';
            }
        }
    });

    if (honAdvTotal > 0) {
        const percPrincStr = extrairValorSeguro('adv-principal-percentual');
        const hasAdvPerc = percPrincStr !== '';
        if (hasAdvPerc) {
            let totalAdv = getNumericValue('adv-principal-percentual');
            for (let i = 1; i <= advogadoAdicionalCount; i++) {
                const percAdStr = extrairValorSeguro(`adv-ad-percentual-${i}`);
                if (percAdStr !== '') {
                    totalAdv += getNumericValue(`adv-ad-percentual-${i}`);
                }
            }
            if (Math.abs(totalAdv - 100) > 0.01) mensagensEspecificas.push(`A soma dos percentuais dos Advogados (Rateio por Percentual) deve ser 100%. Atual: ${totalAdv.toFixed(2)}%`);
        }
    }

    const validarRateioGrupo = (count, prefix, nome, exigeCemPorcento = true) => {
        if (count > 0) {
            let total = 0;
            let has = false;
            for (let i = 1; i <= count; i++) {
                if (document.getElementById(`${prefix}-percentual-${i}`)) { 
                    total += getNumericValue(`${prefix}-percentual-${i}`); 
                    if (extrairValorSeguro(`${prefix}-percentual-${i}`) !== '') {
                        has = true; 
                    }
                }
            }
            if (has) {
                if (exigeCemPorcento && Math.abs(total - 100) > 0.01) {
                    mensagensEspecificas.push(`A soma dos percentuais dos ${nome} deve ser 100%. Atual: ${total.toFixed(2)}%`);
                } else if (!exigeCemPorcento && total > 100.01) {
                    mensagensEspecificas.push(`A soma dos percentuais dos ${nome} não pode exceder 100%. Atual: ${total.toFixed(2)}%`);
                }
            }
        }
    };
    validarRateioGrupo(herdeiroCount, 'her', 'Herdeiros', true);
    validarRateioGrupo(cessionarioCount, 'ces', 'Cessionários', false);

    ['herdeiro', 'cessionario'].forEach(tipo => {
        const count = tipo === 'herdeiro' ? herdeiroCount : cessionarioCount;
        const prefix = tipo === 'herdeiro' ? 'her' : 'ces';
        for (let i = 1; i <= count; i++) {
            if (document.getElementById(`${tipo}-${i}`)) {
                let totalAdv = 0;
                let hasAdv = false;
                const advogados = document.querySelectorAll(`.adv-${tipo}-${i}`);
                advogados.forEach(block => {
                    hasAdv = true;
                    const advId = block.dataset.advId;
                    totalAdv += getNumericValue(`${prefix}-adv-part-${advId}`);
                });

                let honorariosAdvTotalBruto = 0;
                const elCesAdvOptPerc = document.getElementById(`${prefix}-adv-opt-perc-${i}`);
                const isPercGlobal = elCesAdvOptPerc ? elCesAdvOptPerc.checked : false;
                if (isPercGlobal) {
                    honorariosAdvTotalBruto = getNumericValue(`${prefix}-adv-perc-global-${i}`);
                } else {
                    honorariosAdvTotalBruto = getNumericValue(`${prefix}-adv-fix-global-${i}`);
                }

                if (honorariosAdvTotalBruto > 0 && hasAdv && Math.abs(totalAdv - 100) > 0.01) {
                    const nomeCapitalized = tipo.charAt(0).toUpperCase() + tipo.slice(1);
                    mensagensEspecificas.push(`A soma das participações dos advogados do ${nomeCapitalized} ${i} deve ser 100%. Atual: ${totalAdv.toFixed(2)}%`);
                }
            }
        }
    });

    const diferenca = getNumericValue('diferenca-valor');
    const observacoesStr = extrairValorSeguro('observacoes-gerais');
    if (Math.abs(diferenca) > 0.005 && observacoesStr === '') {
        mensagensEspecificas.push('O campo "Observações" é obrigatório, pois existe uma diferença entre o valor depositado e o liberado. Por favor, informe o motivo de forma detalhada e clara (Ex.: a) Diferença relativa a Juros da Conta Corrente; b) Diferença relativa ao Pagamento Parcial referente a "Parcela nº ___ do Acordo nº _________).');
        const obsEl = document.getElementById('observacoes-gerais');
        if (obsEl) obsEl.classList.add('input-error');
    }

    if (camposFaltantes.length > 0 || mensagensEspecificas.length > 0) {
        let mensagemFinal = "";
        if (camposFaltantes.length > 0) {
            const camposUnicos = [...new Set(camposFaltantes)];
            mensagemFinal += "<strong style='color: var(--primary-color);'>Por favor, preencha os seguintes campos obrigatórios:</strong><br><br>• " + camposUnicos.join("<br>• ");
        }
        if (mensagensEspecificas.length > 0) {
            if (mensagemFinal !== "") mensagemFinal += "<br><br><hr style='border: 0; border-top: 1px dashed var(--info-border); margin: 15px 0;'>";
            mensagemFinal += "<strong style='color: var(--primary-color);'>Atenção às seguintes regras:</strong><br><br>" + mensagensEspecificas.join("<br><br>");
        }
        mensagemFinal = mensagemFinal.replace(/\n/g, '<br>');
        showCustomAlert(mensagemFinal);
        return false;
    }
    return true;
}

function gerarRelatorioStr() {
    const dataLiberacao = extrairValorSeguro('data-liberacao-header');
    const procNum = ('0000000' + extrairValorSeguro('proc-num')).slice(-7);
    const procDigito = ('00' + extrairValorSeguro('proc-digito')).slice(-2);
    const procAno = extrairValorSeguro('proc-ano');
    const processoCompleto = `${procNum}-${procDigito}.${procAno}.5.19.0000`;

    const reclamante = extrairValorSeguro('reclamante');
    const cpf = extrairValorSeguro('cpf');

    const valorDeposito = extrairValorSeguro('valor-deposito');
    const idDeposito = extrairValorSeguro('id-deposito');
    const contaJudicial = extrairValorSeguro('conta-judicial');
    const idPlanilha = extrairValorSeguro('id-planilha');

    const totalDevido = extrairValorSeguro('valor-bruto-reclamante') || '0,00';

    const liquidoExequente = extrairValorSeguro('liquido-reclamante-calculo');
    const fgts = extrairValorSeguro('fgts-viculada');
    const previdencia = extrairValorSeguro('valor-previdencia-privada');
    const irValor = extrairValorSeguro('ir-valor');
    const inssReclamante = extrairValorSeguro('inss-reclamante');
    const inssReclamada = extrairValorSeguro('inss-reclamada');
    const custasJudiciais = extrairValorSeguro('input-custas-judiciais');
    const honAdv = extrairValorSeguro('input-honorarios-advocaticios');
    const irrfHonAdv = extrairValorSeguro('input-irrf-honorarios');
    const honPer = extrairValorSeguro('input-honorarios-periciais');
    const irrfHonPer = extrairValorSeguro('input-irrf-periciais');

    let labelHonAdv = 'Hon. Advocatícios';

    const observacoes = extrairValorSeguro('observacoes-gerais');
    const nomeServidor = extrairValorSeguro('nome-servidor');

    const elTbody = document.getElementById('quadro-resumo-tbody');
    let tbodyResumo = elTbody ? elTbody.innerHTML : '';
    const elTfoot = document.getElementById('quadro-resumo-tfoot');
    let tfootResumo = elTfoot ? elTfoot.innerHTML : '';

    tbodyResumo = tbodyResumo.replace(/padding-top: 10px;/g, 'padding-top: 4px;')
                             .replace(/padding-bottom: 10px;/g, 'padding-bottom: 4px;')
                             .replace(/padding-top: 12px;/g, 'padding-top: 6px;')
                             .replace(/padding-bottom: 12px;/g, 'padding-bottom: 6px;')
                             .replace(/padding: 12px 15px;/g, 'padding: 6px 10px;')
                             .replace(/height: 20px;/g, 'height: 12px;')
                             .replace(/color: #444;/g, 'color: #000000;')
                             .replace(/color: #666;/g, 'color: #000000;')
                             .replace(/color: #222;/g, 'color: #000000;')
                             .replace(/color: var\(--dark-accent\);/g, 'color: #000000;')
                             .replace(/background-color: #F8F9FA;/ig, 'background-color: transparent;')
                             .replace(/background-color: #fff3cd;/ig, 'background-color: transparent;')
                             .replace(/background-color: #e0e0e0;/ig, 'background-color: transparent;')
                             .replace(/background-color: #ffffff;/ig, 'background-color: transparent;')
                             .replace(/border-left: 1px solid var\(--info-border\);/g, 'border-left: none;')
                             .replace(/border-right: 1px solid var\(--info-border\);/g, 'border-right: none;')
                             .replace(/border-radius: [^;]+;/g, 'border-radius: 0;')
                             .replace(/border-top: 2px solid var\(--primary-color\);/g, 'border-top: none; border-bottom: 1px solid #000000;')
                             .replace(/border-top: 2px solid var\(--primary-color\);/g, 'border-top: none;')
                             .replace(/border-bottom: 1px solid var\(--info-border\);/g, 'border-bottom: 1px solid #000000;');
                             
    tfootResumo = tfootResumo.replace(/padding-top: 15px;/g, 'padding-top: 8px;')
                             .replace(/padding-bottom: 15px;/g, 'padding-bottom: 8px;')
                             .replace(/padding-top: 12px;/g, 'padding-top: 6px;')
                             .replace(/padding-bottom: 12px;/g, 'padding-bottom: 6px;')
                             .replace(/background-color: #F8F9FA;/ig, 'background-color: transparent;')
                             .replace(/border-left: 1px solid var\(--info-border\);/g, 'border-left: none;')
                             .replace(/border-right: 1px solid var\(--info-border\);/g, 'border-right: none;')
                             .replace(/border-radius: [^;]+;/g, 'border-radius: 0;')
                             .replace(/border-bottom: 1px solid var\(--info-border\);/g, 'border-bottom: 1px solid #000000;')
                             .replace(/border-top: 2px solid var\(--primary-color\);/g, 'border-top: 1px solid #000000;')
                             .replace(/border-top: 1px dashed #ccc;/g, 'border-top: 1px dashed #000000;');

    const planFields = [
        { label: 'Líquido Reclamante', value: liquidoExequente },
        { label: 'FGTS a Depositar', value: fgts },
        { label: 'Previdência Privada', value: previdencia },
        { label: 'IRRF Reclamante', value: irValor },
        { label: 'INSS Reclamante', value: inssReclamante },
        { label: 'INSS Executada', value: inssReclamada },
        { label: 'Custas Judiciais', value: custasJudiciais },
        { label: labelHonAdv, value: honAdv },
        { label: 'IRRF Hon. Adv.', value: irrfHonAdv },
        { label: 'Hon. Periciais', value: honPer },
        { label: 'IRRF Hon. Periciais', value: irrfHonPer }
    ].filter(f => f.value && f.value !== '0,00' && f.value !== '0');

    const headerStyle = 'font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #006464; padding-bottom: 2px; margin: 0 0 6px 0; color: #006464;';

    let conciliacaoHtml = `
        <div class="report-section" style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="${headerStyle}">2. Dados do Depósito e Atualização de Cálculos</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 15px; margin-bottom: 10px;">
                <div>
                    <div style="border-bottom: 1px solid #000000; padding-bottom: 4px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-end;">
                        <strong style="color: #000000; font-size: 10pt; text-transform: uppercase;">Depósito Bancário</strong>
                        ${idDeposito ? `<span style="font-size: 10pt; color: #000000;">ID: ${idDeposito}</span>` : ''}
                    </div>
                    <table style="width: 100%; font-size: 10pt; border-collapse: collapse; color: #000000;">
                        <tr>
                            <td style="padding: 2px 0;"><span style="color: #000000;">Conta Judicial:</span></td>
                            <td style="padding: 2px 0; text-align: right;"><strong>${contaJudicial || '-'}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0;"><span style="color: #000000;">Valor do Depósito:</span></td>
                            <td style="padding: 2px 0; text-align: right;"><strong>${valorDeposito || '-'}</strong></td>
                        </tr>
                    </table>
                </div>
                
                <div>
                    <div style="border-bottom: 1px solid #000000; padding-bottom: 4px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-end;">
                        <strong style="color: #000000; font-size: 10pt; text-transform: uppercase;">Planilha de Atualização de Cálculos</strong>
                        ${idPlanilha ? `<span style="font-size: 10pt; color: #000000;">ID: ${idPlanilha}</span>` : ''}
                    </div>
                    <table style="width: 100%; font-size: 10pt; border-collapse: collapse; color: #000000;">`;
                    
        planFields.forEach(f => {
            conciliacaoHtml += `
                        <tr>
                            <td style="padding: 2px 0;"><span style="color: #000000;">${f.label}:</span></td>
                            <td style="padding: 2px 0; text-align: right;"><strong>${f.value}</strong></td>
                        </tr>`;
        });

        conciliacaoHtml += `
                        <tr>
                            <td style="padding: 4px 0 2px 0; border-top: 1px solid #CCCCCC; margin-top: 2px;"><span style="color: #000000;">Total Devido pela Reclamada:</span></td>
                            <td style="padding: 4px 0 2px 0; border-top: 1px solid #CCCCCC; margin-top: 2px; text-align: right;"><strong>${totalDevido}</strong></td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <div style="border-top: 1px solid #000000; padding-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 10pt; color: #000000;">
                <strong style="text-transform: uppercase;">Conciliação (Depositado - Devido):</strong>
                <strong style="font-size: 11pt; color: ${Math.abs(getNumericValue('diferenca-valor')) > 0.005 ? 'red' : '#000000'};">${document.getElementById('diferenca-valor') ? document.getElementById('diferenca-valor').textContent : '-'}</strong>
            </div>
        </div>
    `;

    const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #000000; line-height: 1.3; max-width: 100%;">
            
            <div class="report-header" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000000; padding-bottom: 10px; margin-bottom: 25px;">
                <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center;">
                    <img src="https://site.trt19.jus.br/sites/default/files/logo-trt19.png" class="report-logo" alt="TRT19" style="height: 40px;">
                </div>
                <div style="flex: 0 1 auto; text-align: center; white-space: nowrap; padding: 0 15px;">
                    <h2 class="report-title" style="margin: 0; color: #000000; font-size: 14pt; font-weight: bold; text-transform: uppercase;">Planilha de Liberação de Crédito</h2>
                    <div style="color: #000000; font-size: 11pt; margin-top: 4px;"><strong>Processo Precatório:</strong> ${processoCompleto}</div>
                </div>
                <div style="flex: 1; color: #000000; font-size: 10pt; text-align: right; white-space: nowrap; align-self: flex-start;">
                    <strong>Data:</strong> ${dataLiberacao}
                </div>
            </div>

            <div class="report-section" style="margin-bottom: 25px; page-break-inside: avoid;">
                <h3 style="${headerStyle}">1. DADOS DO RECLAMANTE</h3>
                <table style="font-size: 10pt; border-collapse: collapse; color: #000000;">
                    <tr>
                        <td style="padding: 2px 5px 2px 0;"><span style="color: #000000;">Reclamante:</span></td>
                        <td style="padding: 2px 20px 2px 0;"><strong style="text-transform: uppercase;">${reclamante}</strong></td>
                        <td style="padding: 2px 5px 2px 0;"><span style="color: #000000;">CPF/CNPJ:</span></td>
                        <td style="padding: 2px 0;"><strong>${cpf}</strong></td>
                    </tr>
                </table>
            </div>

            ${conciliacaoHtml}

            <div class="report-section" style="margin-top: 25px; page-break-inside: avoid;">
                <h3 style="${headerStyle}">3. Quadro Resumo da Liberação</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 10pt; margin: 6px 0 0 0; color: #000000;">
                    <colgroup>
                        <col style="width: 45%;">
                        <col style="width: 30%;">
                        <col style="width: 25%;">
                    </colgroup>
                    <tbody>
                        ${tbodyResumo}
                    </tbody>
                    <tfoot style="background-color: transparent;">
                        ${tfootResumo}
                    </tfoot>
                </table>
            </div>
            
            ${observacoes ? `
            <div class="report-section" style="margin-top: 25px; page-break-inside: avoid;">
                <h3 style="${headerStyle}">4. Observações</h3>
                <div class="report-observacoes-content" style="white-space: pre-wrap; font-size: 10pt; padding: 6px 8px; border: 1px solid #000000; width: 100%; box-sizing: border-box;">${observacoes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            </div>` : ''}

            <div class="report-section signature-block" style="margin-top: 40px; text-align: center; page-break-inside: avoid;">
                <p style="margin: 0; font-weight: bold; font-size: 10pt; text-transform: uppercase;">${nomeServidor}</p>
                <p style="margin: 3px 0 0 0; font-size: 11pt;">Secretaria de Precatórios</p>
                <p style="margin: 3px 0 0 0; font-size: 11pt;">Tribunal Regional do Trabalho da 19ª Região</p>
            </div>
            
        </div>
    `;
    return html;
}

function gerarRelatorio(skipValidation = false) {
    if (!skipValidation && !validarFormulario()) return;
    const html = gerarRelatorioStr();

    const printHtml = `
        <table class="print-layout-table">
            <thead><tr><td class="print-header-space"></td></tr></thead>
            <tbody><tr><td class="print-content-cell">
                ${html}
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

function imprimirPlanilha() {
    document.querySelectorAll('details').forEach(d => d.open = true);
    atualizarQuadroResumo();
    window.print();
}

function fecharRelatorio() {
    document.getElementById('relatorio-modal').style.display = 'none';
    document.body.classList.remove('printing-modal');
}

function limparCampos() {
    document.querySelectorAll('input[type="text"]').forEach(input => input.value = '');
    document.getElementById('adv-adicionais-list').innerHTML = '';
    document.getElementById('peritos-adicionais-list').innerHTML = '';
    document.getElementById('herdeiros-list').innerHTML = '';
    document.getElementById('cessionarios-list').innerHTML = '';
    const listSuc = document.getElementById('adv-sucumbenciais-list');
    if (listSuc) listSuc.innerHTML = '';
    document.getElementById('adv-principal-ir').value = '';
    document.getElementById('adv-principal-retencao').value = '';
    document.getElementById('adv-principal-retencao-motivo').value = '';
    document.getElementById('adv-principal-resultado').value = '';
    
    const chkSuc = document.getElementById('chk-habilitar-sucumbenciais');
    if(chkSuc) chkSuc.checked = false;
    document.getElementById('modal-sucumbenciais-section').style.display = 'none';
    
    const advValorFixado = document.getElementById('adv-valor-fixado');
    if (advValorFixado) {
        advValorFixado.dataset.manual = 'false';
        advValorFixado.dataset.origem = '';
    }

    const percPrinc = document.getElementById('adv-principal-percentual');
    if (percPrinc) percPrinc.value = '';

    const advPrincipalBlock = document.getElementById('adv-principal-block');
    if (advPrincipalBlock) advPrincipalBlock.style.display = 'none';
    
    document.getElementById('perito-principal-ir').value = '';
    document.getElementById('perito-principal-retencao').value = '';
    document.getElementById('perito-principal-retencao-motivo').value = '';
    document.getElementById('perito-principal-resultado').value = '';
    
    const peritoPrincipalBlock = document.getElementById('perito-principal-block');
    if (peritoPrincipalBlock) peritoPrincipalBlock.style.display = 'none';

    const listAdvModal = document.getElementById('lista-advogados-modal');
    if (listAdvModal) listAdvModal.innerHTML = '';
    const listPerModal = document.getElementById('lista-peritos-modal');
    if (listPerModal) listPerModal.innerHTML = '';
    const listSucModal = document.getElementById('lista-sucumbenciais-modal');
    if (listSucModal) listSucModal.innerHTML = '';
    
    modalAdvogadosCount = 0;
    modalPeritosCount = 0;
    modalSucumbenciaisCount = 0;

    window.lastAbaAdvHonNet = 0;
    window.lastAbaAdvIrrfTotal = 0;

    if (document.getElementById('total-hon-adv-modal')) document.getElementById('total-hon-adv-modal').textContent = '0,00';
    if (document.getElementById('total-irrf-adv-modal')) document.getElementById('total-irrf-adv-modal').textContent = '0,00';
    if (document.getElementById('total-hon-per-modal')) document.getElementById('total-hon-per-modal').textContent = '0,00';
    if (document.getElementById('total-irrf-per-modal')) document.getElementById('total-irrf-per-modal').textContent = '0,00';

    const obs = document.getElementById('observacoes-gerais');
    if (obs) obs.value = '';
    const obsPrint = document.getElementById('observacoes-print');
    if (obsPrint) obsPrint.innerText = '';

    const inputHonPer = document.getElementById('input-honorarios-periciais');
    if (inputHonPer) { inputHonPer.value = ''; inputHonPer.dataset.fromModal = 'false'; }

    const inputIrrfPer = document.getElementById('input-irrf-periciais');
    if (inputIrrfPer) { inputIrrfPer.value = ''; inputIrrfPer.dataset.fromModal = 'false'; }

    const inputCustas = document.getElementById('input-custas-judiciais');
    if (inputCustas) inputCustas.value = '';

    const inputHonAdv = document.getElementById('input-honorarios-advocaticios');
    if (inputHonAdv) { inputHonAdv.value = ''; inputHonAdv.dataset.fromModal = 'false'; }
    
    const inputIrrfAdv = document.getElementById('input-irrf-honorarios');
    if (inputIrrfAdv) { inputIrrfAdv.value = ''; inputIrrfAdv.dataset.fromModal = 'false'; }

    const selectServidor = document.getElementById('nome-servidor');
    if (selectServidor) selectServidor.value = '';

    advogadoAdicionalCount = 0;
    herdeiroCount = 0;
    cessionarioCount = 0;
    advHerdeiroCount = 0;
    advCessionarioCount = 0;
    peritoAdicionalCount = 0;
    advSucumbencialCount = 0;
    sucumbenciaisConfirmado = false;
    
    window.currentLoadedKey = null;
    window.loadedProcNumBase = null;
    window.processoDuplicadoConfirmado = false;
    window.motivoProcessoDuplicado = '';
    window.confirmedProcNumBase = null;

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
    verificarTravasHonorarios();
    preencherDataAtual();
    switchToTab('tab-dados');
    atualizarSomaLiquido();
}

// =======================================================================
// EVENTOS DE INICIALIZAÇÃO
// =======================================================================
document.addEventListener('DOMContentLoaded', function () {
    const inputsParaObservar = [
        'ir-valor', 'inss-reclamante', 'inss-reclamada', 'fgts-viculada', 'valor-deposito',
        'input-honorarios-advocaticios', 'input-irrf-honorarios',
        'input-honorarios-periciais', 'input-irrf-periciais',
        'input-custas-judiciais', 'liquido-reclamante-calculo', 'valor-previdencia-privada'
    ];
    inputsParaObservar.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', (e) => {
                formatarMoeda(e.target);
                if (['ir-valor', 'inss-reclamante', 'inss-reclamada', 'fgts-viculada', 'valor-deposito'].includes(id)) {
                    atualizarTotalDevidoReclamada();
                } else {
                    atualizarSomaLiquido();
                }
            });
        }
    });

    ['reclamante', 'adv-nome-principal'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', atualizarQuadroResumo);
    });

    const advPercOpt = document.getElementById('adv-percentual-opt');
    const advFixOpt = document.getElementById('adv-valor-fixado-opt');
    if(advPercOpt) advPercOpt.addEventListener('change', toggleAdvHonorariosFields);
    if(advFixOpt) advFixOpt.addEventListener('change', toggleAdvHonorariosFields);
    
    const advPerc = document.getElementById('adv-percentual');
    if(advPerc) advPerc.addEventListener('input', (e) => formatarPercentual(e.target));
    
    const advFix = document.getElementById('adv-valor-fixado');
    if(advFix) advFix.addEventListener('input', (e) => {
        e.target.dataset.manual = getNumericValue(e.target.id) > 0 ? 'true' : 'false';
        e.target.dataset.origem = 'manual';
        formatarMoeda(e.target);
        calcularHonorarios('adv');
        sincronizarFixadoParaPlanilha();
        verificarTravasHonorarios();
    });

    document.addEventListener('input', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('input-error')) {
            e.target.classList.remove('input-error');
        }
    });

    limparCampos();

    if (localStorage.getItem('hideHelpModal') !== 'true') {
        setTimeout(abrirPainelAjuda, 500);
    }
});

window.onclick = function (event) {
    const modalRelatorio = document.getElementById('relatorio-modal');
    const modalAdvogados = document.getElementById('modal-advogados');
    const modalPeritos = document.getElementById('modal-peritos');
    const modalConfirm = document.getElementById('custom-confirm-modal');
    const modalAlert = document.getElementById('custom-alert-modal');
    const modalPrompt = document.getElementById('custom-prompt-modal');
    const modalAjuda = document.getElementById('modal-ajuda');
    const modalPrevidencia = document.getElementById('modal-previdencia');
    const modalBanco = document.getElementById('modal-banco-rascunhos');
    const modalOpcoesSalvamento = document.getElementById('modal-opcoes-salvamento');

    if (event.target == modalRelatorio) fecharRelatorio();
    if (event.target == modalAdvogados) fecharModalAdvogados();
    if (event.target == modalPeritos) fecharModalPeritos();
    if (event.target == modalConfirm) closeCustomConfirm(false);
    if (event.target == modalAlert) closeCustomAlert();
    if (event.target == modalPrompt) closeCustomPrompt(null);
    if (event.target == modalAjuda) fecharPainelAjuda();
    if (event.target == modalPrevidencia) fecharModalPrevidencia();
    if (event.target == modalBanco) fecharModalBancoRascunhos();
    if (event.target == modalOpcoesSalvamento) fecharOpcoesSalvamento();
};