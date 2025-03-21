from odoo import api, fields, models
from odoo.tools import format_amount
from typing import Dict, List
from dateutil.relativedelta import relativedelta
import datetime
import logging

_logger = logging.getLogger(__name__)

class SalesDashboard(models.Model):
    _name = 'sales.dashboard'
    _description = 'Sales Dashboard'

    
    def get_sales_performance_data(self, date_from, date_to, customer_ids=[], product_ids=[], product_category_ids=[]):
        query = """
            SELECT 
                so.date_order::date as date,
                so.state,
                so.amount_untaxed,
                sol.price_subtotal as amount,
                sol.product_uom_qty as quantity,
                sol.amount_to_invoice,
                sol.waiting_for_payment,
                sol.amount_received,                
                pc.name as product_category,
                pt.name as product_name,
                rp.name as customer,
                rp.id as customer_id,
                so.id as sale_order_id,
                am.state as invoice_state,
                aml.price_subtotal as invoice_amount,
                am.amount_residual as invoice_amount_residual,
                am.id as invoice_id,
                am.invoice_date_due, 
                rpu.name as salesperson
            FROM sale_order_line sol
            INNER JOIN product_product pp ON sol.product_id = pp.id
            INNER JOIN product_template pt ON pp.product_tmpl_id = pt.id
            INNER JOIN product_category pc ON pt.categ_id = pc.id
            INNER JOIN sale_order so ON sol.order_id = so.id
            INNER JOIN res_partner rp ON so.partner_id = rp.id
            INNER JOIN res_users ru ON so.user_id = ru.id
			LEFT JOIN res_partner rpu ON rpu.id = ru.partner_id
            LEFT JOIN sale_order_line_invoice_rel solir ON sol.id = solir.order_line_id
            LEFT JOIN account_move_line aml ON solir.invoice_line_id= aml.id
            LEFT JOIN account_move am ON aml.move_id = am.id
            WHERE so.date_order::date BETWEEN %s AND %s AND sol.company_id = %s
        """
        params = [date_from, date_to, self.env.user.company_id.id]
        if len(product_ids) > 0:
            query += " AND pt.id IN %s"
            params.append(tuple(product_ids))
        if len(customer_ids) > 0:
            query += " AND rp.id IN %s"
            params.append(tuple(customer_ids))
        if len(product_category_ids) > 0:
            # If a product category is specified, include all its child categories in the search
            child_category_ids = []
            for category in product_category_ids:
                # Get all child categories for each specified category
                category_with_children = self.env['product.category'].search([('id', 'child_of', int(category))]).ids
                child_category_ids.extend(category_with_children)
            # Add the original categories if not already included
            for category in product_category_ids:
                if int(category) not in child_category_ids:
                    child_category_ids.append(int(category))
            query += " AND pc.id IN %s"
            params.append(tuple(child_category_ids))
        
        self._cr.execute(query, tuple(params))
        res = self._cr.dictfetchall()
        return res, {'currency_name': self.env.company.currency_id.name, 'currency_symbol': self.env.company.currency_id.symbol}


    def get_product_datas(self):
        query = """
            SELECT 
                pt.id as product_id,
                pt.name as product_name,
                pt.categ_id as product_category_id,
                pc.name as category_name
            FROM product_template pt
            LEFT JOIN product_category pc ON pt.categ_id = pc.id
            WHERE pt.sale_ok = true
        """
        self._cr.execute(query)
        res = self._cr.dictfetchall()
        return res
    
    def get_product_category_datas(self):
        query = """
            SELECT 
                pc.id as product_category_id,
                pc.complete_name as product_category_name
            FROM product_category pc
        """
        self._cr.execute(query)
        res = self._cr.dictfetchall()
        return res

