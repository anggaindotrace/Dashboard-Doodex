from odoo import api, fields, models
from odoo.tools import format_amount
from typing import Dict, List
from dateutil.relativedelta import relativedelta
import datetime

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
    
    def _build_account_query(self, account_types: list) -> str:
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
            WHERE aa.account_type IN %s
        """
        return query
    
    def get_revenue(self, date_from: datetime = None, date_to: datetime = None) -> Dict[str, float]:
        """
            Get the revenue for a given date range
        """
        query = self._build_account_query(['income'])
        if date_from and date_to:
            query += f" AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('income',), date_from, date_to))
        else:
            results = self._execute_query(query, (('income',),))
            
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
        query = self._build_account_query(['expense_direct_cost'])
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('expense_direct_cost',), date_from, date_to))
        else:
            results = self._execute_query(query, (('expense_direct_cost',),))
            
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
        query = self._build_account_query(['expense'])
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('expense',), date_from, date_to))
        else:
            results = self._execute_query(query, (('expense',),))

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
        query = self._build_account_query(['income_other'])
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('income_other',), date_from, date_to))
        else:
            results = self._execute_query(query, (('income_other',),))

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
        query = self._build_account_query(['expense_depreciation'])
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('expense_depreciation',), date_from, date_to))
        else:
            results = self._execute_query(query, (('expense_depreciation',),))

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
        query = self._build_account_query(['asset_cash', 'asset_current', 'asset_non_current', 'asset_fixed', 'asset_receivable', 'asset_prepayments'])
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('asset_cash', 'asset_current', 'asset_non_current', 'asset_fixed', 'asset_receivable', 'asset_prepayments'), date_from, date_to))
        else:
            results = self._execute_query(query, (('asset_cash', 'asset_current', 'asset_non_current', 'asset_fixed', 'asset_receivable', 'asset_prepayments'),))

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
        '''
        if date_from and date_to:
            results = self._execute_query(query, (date_from, date_to))
        else:
            results = self._execute_query(query)

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
        query = self._build_account_query(['asset_receivable'])
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('asset_receivable',), date_from, date_to))
        else:
            results = self._execute_query(query, (('asset_receivable',),))

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
        query = self._build_account_query(['liability_payable'])
        if date_from and date_to:
            query += " AND aml.date BETWEEN %s AND %s"
            results = self._execute_query(query, (('liability_payable',), date_from, date_to))
        else:
            results = self._execute_query(query, (('liability_payable',),))

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
        query = '''
            SELECT expected_revenue
            FROM crm_lead
            WHERE won_status = 'won' AND date_last_stage_update BETWEEN %s AND %s
        '''
        if date_from and date_to:
            results = self._execute_query(query, (date_from, date_to))
        else:
            results = self._execute_query(query)
        
        return sum(r['expected_revenue'] for r in results)

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
        percentage_revenue = (current_data['revenue'] - prev_data['revenue']) / prev_data['revenue'] * 100 if prev_data['revenue'] else 0
        percentage_bfr = (current_data['bfr'] - prev_data['bfr']) / prev_data['bfr'] * 100 if prev_data['bfr'] else 0
        percentage_gross_profit_margin = (current_data['gross_profit_margin'] - prev_data['gross_profit_margin']) / prev_data['gross_profit_margin'] * 100 if prev_data['gross_profit_margin'] else 0
        percentage_net_profit_margin = (current_data['net_profit_margin'] - prev_data['net_profit_margin']) / prev_data['net_profit_margin'] * 100 if prev_data['net_profit_margin'] else 0
        percentage_roi = (current_data['roi'] - prev_data['roi']) / prev_data['roi'] * 100 if prev_data['roi'] else 0
        percentage_stock_valuation = (current_data['stock_valuation'] - prev_data['stock_valuation']) / prev_data['stock_valuation'] * 100 if prev_data['stock_valuation'] else 0
        percentage_number_of_opportunities = (current_data['number_of_opportunities'] - prev_data['number_of_opportunities']) / prev_data['number_of_opportunities'] * 100 if prev_data['number_of_opportunities'] else 0

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