from odoo import api, fields, models

class UniversalDashboard(models.Model):
    _name = 'universal.dashboard'
    _description = 'Universal Dashboard'

    @api.model
    def get_all_kpi(self, *args, **kwargs):
        """
            Get All Data for KPI Card
        """
        #GET TOTAL REVENUE
        query = """
            SELECT SUM(total_amount) FROM sale_order
        """
