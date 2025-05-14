-- Primeiro, vamos criar uma função para adicionar grupos
CREATE OR REPLACE FUNCTION add_group_if_not_exists(
  p_user_id uuid,
  p_name text
) RETURNS uuid AS $$
DECLARE
  v_group_id uuid;
BEGIN
  -- Verificar se o grupo já existe
  SELECT id INTO v_group_id
  FROM groups
  WHERE user_id = p_user_id AND name = p_name;

  -- Se não existir, criar novo grupo
  IF v_group_id IS NULL THEN
    INSERT INTO groups (user_id, name)
    VALUES (p_user_id, p_name)
    RETURNING id INTO v_group_id;
  END IF;

  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql;

-- Função para adicionar subgrupos
CREATE OR REPLACE FUNCTION add_subgroup_if_not_exists(
  p_user_id uuid,
  p_group_id uuid,
  p_name text
) RETURNS uuid AS $$
DECLARE
  v_subgroup_id uuid;
BEGIN
  -- Verificar se o subgrupo já existe
  SELECT id INTO v_subgroup_id
  FROM subgroups
  WHERE user_id = p_user_id AND group_id = p_group_id AND name = p_name;

  -- Se não existir, criar novo subgrupo
  IF v_subgroup_id IS NULL THEN
    INSERT INTO subgroups (user_id, group_id, name)
    VALUES (p_user_id, p_group_id, p_name)
    RETURNING id INTO v_subgroup_id;
  END IF;

  RETURN v_subgroup_id;
END;
$$ LANGUAGE plpgsql;

-- Função para adicionar contas
CREATE OR REPLACE FUNCTION add_account_if_not_exists(
  p_user_id uuid,
  p_subgroup_id uuid,
  p_name text
) RETURNS uuid AS $$
DECLARE
  v_account_id uuid;
BEGIN
  -- Verificar se a conta já existe
  SELECT id INTO v_account_id
  FROM accounts
  WHERE user_id = p_user_id AND subgroup_id = p_subgroup_id AND name = p_name;

  -- Se não existir, criar nova conta
  IF v_account_id IS NULL THEN
    INSERT INTO accounts (user_id, subgroup_id, name, is_active)
    VALUES (p_user_id, p_subgroup_id, p_name, true)
    RETURNING id INTO v_account_id;
  END IF;

  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Função para criar o plano de contas completo para um usuário
CREATE OR REPLACE FUNCTION create_chart_of_accounts(p_user_id uuid) RETURNS void AS $$
DECLARE
  v_group_id uuid;
  v_subgroup_id uuid;
BEGIN
  -- Receita
  v_group_id := add_group_if_not_exists(p_user_id, 'Receita');
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Receita');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar contas de Receitas');

  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Receita Financeira');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Rendimentos de Aplicações Financeiras');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Juros e Descontos Obtidos');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Variação Cambial');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Outras Receitas Financeiras');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Receita Financeira');

  -- Deduções
  v_group_id := add_group_if_not_exists(p_user_id, 'Deduções');
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Deduções da receita');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Simples Nacional');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'ISSQN');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'ICMS');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'PIS');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Cofins');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Tributos parcelados');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Devoluções');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Deduções da receita');

  -- Custos
  v_group_id := add_group_if_not_exists(p_user_id, 'Custos');
  
  -- Custos com Mercadorias Vendidas
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Custos com Mercadorias Vendidas');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Fornecedores');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Custos com Embalagens');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Frete sobre Compra');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Frete sobre Venda');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Comissão sobre Vendas');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Serviços de Terceiros');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'IPI');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Outros custos com Mercadoria');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Custos com Mercadorias Vendidas');

  -- Custos com Serviços Prestados
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Custos com Serviços Prestados');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Comissão sobre serviços-CSP');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Serviços de terceiros-CSP');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Compra de material para consumo-CSP');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Manutenção Equipamentos');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Outros custos com Serviços');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Custos com Serviços Prestados');

  -- Custos com Mão de Obra
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Custos com Mão de Obra');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Salário');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Pró-Labore');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Décimo terceiro');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Férias');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Rescisão');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'INSS');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'FGTS');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'IRPF');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Alimentação');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Vale transporte');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Treinamento e Desenvolvimento');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Outras Custos com Mão de Obra Direta');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Custos com Mão de Obra');

  -- Outros Custos
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Outros Custos');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras Outros Custos');

  -- Despesas Operacionais
  v_group_id := add_group_if_not_exists(p_user_id, 'Despesas Operacionais');

  -- Despesas Financeiras
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Despesas Financeiras');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Tarifas Bancárias');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Tarifas de Cartão');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Aluguel de Máquinas de Cartão');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'IOF');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Juros e Multas Financeiras');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Outros despesas financeiras');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Despesas Financeiras');

  -- Despesas Administrativas
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Despesas Administrativas');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Telefone e Internet-ADM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Celular-ADM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Energia Elétrica');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Aluguel e Condomínio');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Água');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'IPTU e Taxas Públicas');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Despesas de Viagens-ADM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Cartórios');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Contabilidade');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Assessoria Jurídica');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Consultoria Financeira');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Serviços de terceiros-ADM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Alarme Monitorado / Segurança');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Manutenção Máquinas e Equipamentos-ADM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Materiais de Expediente/Escritório');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Materiais de Limpeza e Manutenção Predial');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Seguros');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Gasolina / Combustível-ADM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Manutenção de Veículos');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'IPVA / Licenciamento / Despachante');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Estacionamento / Pedágios-ADM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Outras despesas administrativas');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Despesas Administrativas');

  -- Despesas com Pessoal
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Despesas com Pessoal');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Salário');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Pró-Labore');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Décimo terceiro');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Férias');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Rescisão');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'INSS');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'IRPF');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'FGTS');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Vale transporte');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Vale Alimentação');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Convênio Medico');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Exames ocupacionais');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Treinamento e Desenvolvimento');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Confraternização');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Outras Custos com Mão de Obra Direta');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Despesas com Pessoal');

  -- Despesas Comerciais
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Despesas Comerciais');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Telefone e Internet-COM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Celular-COM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Despesas de Viagens-COM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Serviços de Terceiros-COM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Gasolina / Combustível-COM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Estacionamento / Pedágios-COM');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Eventos com Clientes');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Brindes');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Outras despesas Comerciais');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Despesas Comerciais');

  -- Despesas Marketing
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Despesas Marketing');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Telefone e Internet-MKT');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Celular-MKT');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Despesas de Viagens-MKT');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Gasolina/Combustível-MKT');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Estacionamento/Pedágios-MKT');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Anúncio/Mídias/Propaganda');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Agências de markentig e Gestão de trafégo');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Realização Eventos');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Serviços de terceiros-MKT');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Ferramentas e aplicativos - Marketing');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Outras despesas marketing');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Despesas Marketing');

  -- Outras Despesas
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Outras Despesas');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Outras Despesas');

  -- Investimentos
  v_group_id := add_group_if_not_exists(p_user_id, 'Investimentos');

  -- Investimentos em Bens Materiais
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Investimentos em Bens Materiais');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Compra de Máquinas e Equipamentos');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Reformas / Estrutura');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Mobiliário');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Compra de Veículos');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Outros investimentos em bens materiais');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Investimentos em Bens Materiais');

  -- Outros Investimentos
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Outros Investimentos');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Outros Investimentos');

  -- Movimentações Não Operacionais
  v_group_id := add_group_if_not_exists(p_user_id, 'Movimentações Não Operacionais');

  -- Entradas não Operacionais
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Entradas não Operacionais');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Empréstimos/Financiamentos obtidos');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Aporte dos sócios');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Venda de equipamentos usados');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Outros entradas não operacionais');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'opção e criar outras contas Entradas não Operacionais');

  -- Saídas não Operacionais
  v_subgroup_id := add_subgroup_if_not_exists(p_user_id, v_group_id, 'Saídas não Operacionais');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Pagamento de Empréstimos');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Juros Bancários e por Atraso');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Pagamento de dívidas passadas');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Distribuição de Lucros');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Juros de Antecipação de Recebíveis');
  PERFORM add_account_if_not_exists(p_user_id, v_subgroup_id, 'Outras saídas não operacionais');
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar plano de contas ao criar novo usuário
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_chart_of_accounts(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created_chart_of_accounts ON auth.users;
CREATE TRIGGER on_auth_user_created_chart_of_accounts
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_chart_of_accounts();

-- Criar plano de contas para usuários existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM auth.users
  LOOP
    PERFORM create_chart_of_accounts(r.id);
  END LOOP;
END $$;