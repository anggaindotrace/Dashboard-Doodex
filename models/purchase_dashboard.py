from odoo import models, fields, api, _
from typing import Dict, List
from dateutil.relativedelta import relativedelta
import datetime
import logging

_logger = logging.getLogger(__name__)

class PurchaseDashboard(models.Model):
    _name = 'purchase.dashboard'
    _description = 'Purchase Dashboard'

    def calculate_quality_score(self, purchase_order_name):
        # Fetch on-time rate
        stock_pickings = self.env['stock.picking'].search([('origin', '=', purchase_order_name)])
        on_time_deliveries = sum(1 for picking in stock_pickings if picking.scheduled_date <= picking.date_deadline)
        on_time_rate = (on_time_deliveries / len(stock_pickings)) * 100 if stock_pickings else 0

        # Fetch return rate
        total_received = sum(move.quantity for move in stock_pickings.mapped('move_ids'))
        
        #fetch total returned
        stock_return_id = self.env['stock.picking'].search([('return_id.origin', '=', purchase_order_name)])
        total_returned = sum(move.quantity for move in stock_return_id.mapped('move_ids'))
        return_rate = (total_returned / total_received) * 100 if total_received else 0

        # Fetch pass rate
        quality_checks = self.env['quality.check'].search([('picking_id.origin', '=', purchase_order_name)])
        total_checks = len(quality_checks)
        passed_checks = sum(1 for check in quality_checks if check.quality_state == 'pass')
        pass_rate = (passed_checks / total_checks) * 100 if total_checks else 0

        # Calculate quality score
        quality_score = (0.4 * on_time_rate) + (0.3 * (100 - return_rate)) + (0.3 * pass_rate)
        return quality_score
    
    @api.model
    def get_purchase_performance_data(self, date_from:datetime.date, date_to:datetime.date, product_category_ids:List[int]=[], supplier_ids:List[int]=[]) -> Dict:
        """
        Get purchase performance data for the dashboard
        
        :param date_from: Start date
        :param date_to: End date
        :param product_category_ids: List of product category ids
        :param supplier_ids: List of supplier ids
        :return: Dict of purchase performance data
        """
        query = """
            SELECT
                po.id as purchase_order_id,
                po.name as purchase_order_name,
                po.date_order::date as date_order,
                po.date_planned::date as expected_arrival,
                po.effective_date::date as arrival_date,
                po.state,
                po.receipt_status as receipt_status,
                pol.price_subtotal as amount,
                pol.product_uom_qty as quantity,
                pol.price_tax as tax,
                pc.name as product_category,
                pc.complete_name as complete_product_category, 
                pt.name as product_name,
                rp.name as vendor,
                rp.id as vendor_id
            from purchase_order_line pol 
            INNER JOIN product_product pp ON pol.product_id = pp.id
            INNER JOIN product_template pt ON pp.product_tmpl_id = pt.id
            INNER JOIN product_category pc ON pt.categ_id = pc.id
            INNER JOIN purchase_order po ON pol.order_id = po.id
            INNER JOIN res_partner rp ON po.partner_id = rp.id
            WHERE po.date_order::date BETWEEN %s AND %s AND po.company_id = %s
        """
        params = [date_from, date_to, self.env.user.company_id.id]
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
        
        if len(supplier_ids) > 0:
            query += " AND rp.id IN %s"
            params.append(tuple(supplier_ids))
        
        self._cr.execute(query, tuple(params))
        res = self._cr.dictfetchall()

        for rec in res:
            rec['quality_score'] = self.calculate_quality_score(rec['purchase_order_name'])

        return res, {'currency_name': self.env.company.currency_id.name, 'currency_symbol': self.env.company.currency_id.symbol}

    @api.model
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