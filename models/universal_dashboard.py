from odoo import api, fields, models
from odoo.tools import format_amount
from typing import Dict, List
from dateutil.relativedelta import relativedelta
import datetime
import logging

_logger = logging.getLogger(__name__)

class UniversalDashboard(models.Model):
    _name = 'universal.dashboard'
    _description = 'Universal Dashboard'

    def _execute_query(self, query: str, params: tuple = None) -> List:
        """
            Execute a SQL query and return the results
            Args:
                query (str): The SQL query to execute
            Returns:
                List: The results of the query
        """
        if params:
            self._cr.execute(query, params)
        else:
            self._cr.execute(query)
        return self._cr.dictfetchall()
    
    def _build_account_query(self, account_types: list, company_id: int) -> str:
        """
            Build a SQL query to get the account balance
            args:
                account_types (list): The type of the account
            returns:
                str: The SQL query
        """
        query = """
            SELECT 
                aml.credit,
                aml.debit,
                aml.balance,
                aml.date,
                aa.account_type
            FROM account_move_line aml
            INNER JOIN account_account aa ON aml.account_id = aa.id
            INNER JOIN account_move am ON aml.move_id = am.id
            WHERE aa.account_type IN %s AND am.company_id = %s
        """
        return query
    
    def get_revenue(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the revenue for a given date range
        """
        company_id = self.env.company.id
        query = self._build_account_query(['income'], company_id)
        if date_from and date_to:
            query += f" AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('income',), company_id, date_from, date_to))
        else:
            results = self._execute_query(query, (('income',), company_id))
            
        return {
            'total_credit': sum(r['credit'] for r in results),
            'total_debit': sum(r['debit'] for r in results),
            'net_revenue': sum(r['credit'] - r['debit'] for r in results)
        }
    
    def get_cost_of_revenue(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the cost of revenue for a given date range

        Args:
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: The cost of revenue
        """
        company_id = self.env.company.id
        query = self._build_account_query(['expense_direct_cost'], company_id)
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('expense_direct_cost',), company_id, date_from, date_to))
        else:
            results = self._execute_query(query, (('expense_direct_cost',), company_id))
            
        return sum(r['balance'] for r in results)
    
    def get_operating_expenses(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the operating expenses for a given date range
        Args:
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: The operating expenses
        """
        company_id = self.env.company.id
        query = self._build_account_query(['expense'], company_id)
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('expense',), company_id, date_from, date_to))
        else:
            results = self._execute_query(query, (('expense',), company_id))

        return sum(r['balance'] for r in results)

    def get_other_income(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the other income for a given date range

        Args:
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: The other income
        """
        company_id = self.env.company.id
        query = self._build_account_query(['income_other'], company_id)
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('income_other',), company_id, date_from, date_to))
        else:
            results = self._execute_query(query, (('income_other',), company_id))

        return sum(r['balance'] for r in results)
    
    def get_other_expenses(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the other expenses for a given date range

        Args:
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: The other expenses
        """
        company_id = self.env.company.id
        query = self._build_account_query(['expense_depreciation'], company_id)
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('expense_depreciation',), company_id, date_from, date_to))
        else:
            results = self._execute_query(query, (('expense_depreciation',), company_id))

        return sum(r['balance'] for r in results)
    
    def get_total_assets(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the total assets for a given date range

        Args:
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: The total assets
        """
        company_id = self.env.company.id
        query = self._build_account_query(['asset_cash', 'asset_current', 'asset_non_current', 'asset_fixed', 'asset_receivable', 'asset_prepayments'], company_id)
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('asset_cash', 'asset_current', 'asset_non_current', 'asset_fixed', 'asset_receivable', 'asset_prepayments'), company_id, date_from, date_to))
        else:
            results = self._execute_query(query, (('asset_cash', 'asset_current', 'asset_non_current', 'asset_fixed', 'asset_receivable', 'asset_prepayments'), company_id))

        return sum(r['balance'] for r in results)
    
    def get_stock_valuation(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the stock valuation for a given date range

        Args:
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: The stock valuation
        """
        query = '''
            SELECT value
            FROM stock_valuation_layer
            WHERE create_date BETWEEN %s AND %s
            AND company_id = %s
        '''
        company_id = self.env.company.id
        if date_from and date_to:
            results = self._execute_query(query, (date_from, date_to, company_id))
        else:
            results = self._execute_query(query, (company_id,))

        return sum(r['value'] for r in results)
    
    def get_receivables(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the receivables for a given date range

        Args:
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: The receivables
        """
        company_id = self.env.company.id
        query = self._build_account_query(['asset_receivable'], company_id)
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('asset_receivable',), company_id, date_from, date_to))
        else:
            results = self._execute_query(query, (('asset_receivable',), company_id))

        return sum(r['balance'] for r in results)

    def get_payables(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the payables for a given date range

        Args:
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: The payables
        """
        company_id = self.env.company.id
        query = self._build_account_query(['liability_payable'], company_id)
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('liability_payable',), company_id, date_from, date_to))
        else:
            results = self._execute_query(query, (('liability_payable',), company_id))

        return sum(r['balance'] for r in results)
    
    def get_number_of_opportunities(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the number of opportunities for a given date range

        Args:
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: The number of opportunities
        """
        company_id = self.env.company.id
        query = '''
            SELECT so.amount_total
            FROM crm_lead cl
            INNER JOIN sale_order so ON so.opportunity_id = cl.id
            WHERE cl.won_status = 'won' AND so.date_order BETWEEN %s AND %s 
            AND so.company_id = %s
        '''
        if date_from and date_to:
            results = self._execute_query(query, (date_from, date_to, company_id))
        else:
            results = self._execute_query(query, (company_id,))
        
        total_amount = sum(r['amount_total'] for r in results) if results else 0
        
        return total_amount

    def calculate_financial_metrics(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """Calculate the financial metrics for a given date range

        Args:
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: Dictionary with the financial metrics
        """
        #bfr
        stock_valuation = self.get_stock_valuation(date_from, date_to)
        receivables = self.get_receivables(date_from, date_to)
        payables = self.get_payables(date_from, date_to)
        bfr = stock_valuation + receivables - payables

        #financial performance
        revenue = self.get_revenue(date_from, date_to)
        cost_of_revenue = self.get_cost_of_revenue(date_from, date_to)
        operating_expenses = self.get_operating_expenses(date_from, date_to)
        other_income = self.get_other_income(date_from, date_to)
        other_expenses = self.get_other_expenses(date_from, date_to)
        
        #calculate performance metrics
        gross_profit = revenue['net_revenue'] - cost_of_revenue
        operating_profit = gross_profit - operating_expenses
        net_profit = operating_profit + other_income - other_expenses
        total_assets = self.get_total_assets(date_from, date_to)

        #calculate financial ratios
        gross_profit_margin = (gross_profit / operating_profit) * 100 if operating_profit else 0
        net_profit_margin = (net_profit / revenue['net_revenue']) * 100 if revenue['net_revenue'] else 0
        roi = (net_profit / total_assets) * 100 if total_assets else 0

        #number of opportunities
        number_of_opportunities = self.get_number_of_opportunities(date_from, date_to)

        return {
            'revenue': revenue['net_revenue'],
            'bfr': bfr,
            'gross_profit_margin': gross_profit_margin,
            'net_profit_margin': net_profit_margin,
            'roi': roi,
            'stock_valuation': stock_valuation,
            'number_of_opportunities': number_of_opportunities
        }

    def previous_financial_metrics(self, period_type:str, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the previous financial metrics for a given date range
        """
        date_from = datetime.datetime.strptime(date_from, '%Y-%m-%d').date()
        date_to = datetime.datetime.strptime(date_to, '%Y-%m-%d').date()
        prev_date_from = date_from
        prev_date_to = date_to
        if period_type == 'month':
            prev_date_from = date_from - relativedelta(months=1)
            prev_date_to = (prev_date_from + relativedelta(months=1)) - relativedelta(days=1)
        elif period_type == 'quarter':
            prev_date_from = date_from - relativedelta(months=3)
            prev_date_to = (prev_date_from + relativedelta(months=3)) - relativedelta(days=1)
        elif period_type == 'year':
            prev_date_from = date_from - relativedelta(years=1)
            prev_date_to = (prev_date_from + relativedelta(years=1)) - relativedelta(days=1)
        return self.calculate_financial_metrics(prev_date_from, prev_date_to)
    
    @api.model
    def get_financial_metrics(self, period_type: str, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the financial metrics for a given date range

        Args:
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: The financial metrics
        """
        company = self.env.company
        currency = company.currency_id

        prev_data = self.previous_financial_metrics(period_type, date_from, date_to)
        current_data = self.calculate_financial_metrics(date_from, date_to)

        #percentage
        percentage_revenue = (current_data['revenue'] - prev_data['revenue']) / abs(prev_data['revenue']) * 100 if prev_data['revenue'] else 0
        percentage_bfr = (current_data['bfr'] - prev_data['bfr']) / abs(prev_data['bfr']) * 100 if prev_data['bfr'] else 0
        percentage_gross_profit_margin = (current_data['gross_profit_margin'] - prev_data['gross_profit_margin']) / abs(prev_data['gross_profit_margin']) * 100 if prev_data['gross_profit_margin'] else 0
        percentage_net_profit_margin = (current_data['net_profit_margin'] - prev_data['net_profit_margin']) / abs(prev_data['net_profit_margin']) * 100 if prev_data['net_profit_margin'] else 0
        percentage_roi = (current_data['roi'] - prev_data['roi']) / abs(prev_data['roi']) * 100 if prev_data['roi'] else 0
        percentage_stock_valuation = (current_data['stock_valuation'] - prev_data['stock_valuation']) / abs(prev_data['stock_valuation']) * 100 if prev_data['stock_valuation'] else 0
        percentage_number_of_opportunities = (current_data['number_of_opportunities'] - prev_data['number_of_opportunities']) / abs(prev_data['number_of_opportunities']) * 100 if prev_data['number_of_opportunities'] else 0

        data = {
            'revenue' : format_amount(self.env, current_data['revenue'], currency),
            'bfr' : format_amount(self.env, current_data['bfr'], currency),
            'gross_profit_margin' : f"{round(current_data['gross_profit_margin'], 2)}%",
            'net_profit_margin' : f"{round(current_data['net_profit_margin'], 2)}%",
            'roi' : f"{round(current_data['roi'], 2)}%",
            'stock_valuation' : format_amount(self.env, current_data['stock_valuation'], currency),
            'number_of_opportunities' : format_amount(self.env, current_data['number_of_opportunities'], currency),
            'percentage' : {
                'revenue': round(percentage_revenue, 2),
                'bfr': round(percentage_bfr, 2),
                'gross_profit_margin': round(percentage_gross_profit_margin, 2),
                'net_profit_margin': round(percentage_net_profit_margin, 2),
                'roi': round(percentage_roi, 2),
                'stock_valuation': round(percentage_stock_valuation, 2),
                'number_of_opportunities': round(percentage_number_of_opportunities, 2)
            }
        }
        return data

    @api.model
    def get_sales_purchase_evolution(self, period_type: str, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the sales and purchase evolution for a given date range

        Args:
            period_type (str): The period type
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: The sales and purchase evolution
        """
        period_units = {
            'month': 'DAY',
            'quarter': 'WEEK',
            'year': 'MONTH'
        }
    
        period_unit = period_units.get(period_type)
        if not period_unit:
            raise ValueError(f"Invalid period_type: {period_type}")

        company_id = self.env.company.id

        purchase_query = f'''
            SELECT 
                EXTRACT({period_unit} FROM date_approve) AS period,
                SUM(amount_total) AS amount
            FROM purchase_order
            WHERE state = 'purchase' 
            AND date_approve BETWEEN %s AND %s
            AND company_id = %s
            GROUP BY period
            ORDER BY period
        '''
        purchase_data = self._execute_query(purchase_query, (date_from, date_to, company_id))

        sales_query = f'''
            SELECT 
                EXTRACT({period_unit} FROM date_order) AS period,
                SUM(amount_total) AS amount
            FROM sale_order
            WHERE state = 'sale' AND date_order BETWEEN %s AND %s
            AND company_id = %s
            GROUP BY period
            ORDER BY period
        '''
        sales_data = self._execute_query(sales_query, (date_from, date_to, company_id))
        sales_dict = {item['period']: item['amount'] for item in sales_data}
        purchase_dict = {item['period']: item['amount'] for item in purchase_data}
        all_periods = set(sales_dict.keys()) | set(purchase_dict.keys())
        merged_data = [{
            'period': period,
            'purchase': purchase_dict.get(period, 0),
            'sales': sales_dict.get(period, 0)
        } for period in sorted(all_periods)]

        return merged_data

    @api.model
    def get_stock_crm_distribution(self, period_type: str, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the stock and crm distribution for a given date range

        Args:
            period_type (str): The period type
            date_from (datetime, optional): The start date. Defaults to None.
            date_to (datetime, optional): The end date. Defaults to None.

        Returns:
            Dict[str, float]: The stock and crm distribution, as well as BFR
        """
        period_units = {
            'month': 'DAY',
            'quarter': 'WEEK',
            'year': 'MONTH'
        }
    
        period_unit = period_units.get(period_type)
        if not period_unit:
            raise ValueError(f"Invalid period_type: {period_type}")

        company_id = self.env.company.id

        stock_valuation_breakdown = f'''
            SELECT 
                EXTRACT({period_unit} FROM create_date) AS period,
                SUM(value) AS total_stock_valuation
            FROM stock_valuation_layer
            WHERE create_date BETWEEN %s AND %s
            AND company_id = %s
            GROUP BY period
            ORDER BY period
        '''
        stock_valuation_data = self._execute_query(stock_valuation_breakdown, (date_from, date_to, company_id))

        crm_breakdown = f'''
            SELECT 
                EXTRACT({period_unit} FROM so.date_order) AS period,
                SUM(so.amount_total) AS number_of_opportunities
            FROM crm_lead cl
            INNER JOIN sale_order so ON so.opportunity_id = cl.id
            WHERE cl.won_status = 'won' AND so.date_order BETWEEN %s AND %s AND cl.company_id = %s
            GROUP BY period
            ORDER BY period
        '''
        crm_data = self._execute_query(crm_breakdown, (date_from, date_to, company_id))

        receivables_breakdown = f'''
            SELECT
                EXTRACT({period_unit} FROM aml.date) AS period,
                SUM(aml.balance) AS receivables
            FROM account_move_line aml
            INNER JOIN account_account aa ON aml.account_id = aa.id
            INNER JOIN account_move am ON aml.move_id = am.id
            WHERE aa.account_type IN ('asset_receivable') 
            AND am.company_id = %s
            AND aml.date BETWEEN %s AND %s
            GROUP BY period
            ORDER BY period
        '''
        receivables_data = self._execute_query(receivables_breakdown, (company_id, date_from, date_to))

        payables_breakdown = f'''
            SELECT 
                EXTRACT({period_unit} FROM aml.date) AS period,
                SUM(aml.balance) AS payables
            FROM account_move_line aml
            INNER JOIN account_account aa ON aml.account_id = aa.id
            INNER JOIN account_move am ON aml.move_id = am.id
            WHERE aa.account_type IN ('liability_payable') AND am.company_id = %s AND aml.date BETWEEN %s AND %s
            GROUP BY period
            ORDER BY period
        '''
        payables_data = self._execute_query(payables_breakdown, (company_id, date_from, date_to))
        stock_valution_dict = {item['period']: item['total_stock_valuation'] for item in stock_valuation_data}
        crm_dict = {item['period']: item['number_of_opportunities'] for item in crm_data}
        receivables_dict = {item['period']: item['receivables'] for item in receivables_data}
        payables_dict = {item['period']: item['payables'] for item in payables_data}

        common_periods = set(stock_valution_dict.keys()) | set(crm_dict.keys()) | set(receivables_dict.keys()) | set(payables_dict.keys())
        merged_data = [{
            'period': period,
            'stock_valuation': stock_valution_dict.get(period, 0),
            'crm': crm_dict.get(period, 0),
            'bfr': receivables_dict.get(period, 0) + stock_valution_dict.get(period, 0) - payables_dict.get(period, 0)
        } for period in sorted(common_periods)]
        return merged_data

    
    def _build_account_query_category_breakdown(self, account_types: list) -> str:
        """
            Build a SQL query to get the account balance
            args:
                account_types (list): The type of the account
            returns:
                str: The SQL query
        """
        query = """
            SELECT 
                aml.credit,
                aml.debit,
                aml.balance,
                aml.date,
                aml.purchase_order_id,
                aml.sale_order_id
            FROM account_move_line aml
            INNER JOIN account_account aa ON aml.account_id = aa.id
            INNER JOIN account_move am ON aml.move_id = am.id
            INNER JOIN sale_order so ON aml.sale_order_id = so.id
        """
        return query

    @api.model
    def get_category_breakdown_data(self, period_type: str, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the category breakdown data for a given date range
        """
        move_lines = self.env['account.move.line'].search([('date', '>=', date_from),
                                                           ('date', '<=', date_to)])
        purchase_data = move_lines.filtered(lambda ml: ml.purchase_order_id)
        sale_data = move_lines.filtered(lambda ml: ml.sale_line_ids)
        
        result = []
        for purchase in purchase_data:
            print(f"purchase_data=============: {purchase.product_id.product_tmpl_id._fields['type']}")
            result.append({
                'type': 'Purchase',
                'amount': abs(purchase.balance),
                'product_id': purchase.product_id.id,
                'product_name': purchase.product_id.name,
                'product_type': dict(purchase.product_id.product_tmpl_id._fields['type'].selection).get(purchase.product_id.product_tmpl_id.type),
                'purchase_order_id': purchase.purchase_order_id.id,
                'move_line_id': purchase.id,
                'currency_id': purchase.currency_id.name,
                'currency_symbol': purchase.currency_id.symbol
             })
        for sale in sale_data:
            result.append({
                'type': 'Sale',
                'amount': abs(sale.balance),
                'product_id': sale.product_id.id,
                'product_name': sale.product_id.name,
                'product_type': dict(sale.product_id.product_tmpl_id._fields['type'].selection).get(sale.product_id.product_tmpl_id.type),
                'sale_order_id': sale.sale_line_ids.mapped('order_id').ids,
                'move_line_id': sale.id,
                'currency_id': sale.currency_id.name,
                'currency_symbol': sale.currency_id.symbol
            })

        return result
