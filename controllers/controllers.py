# -*- coding: utf-8 -*-
# from odoo import http


# class UniversalDashboard(http.Controller):
#     @http.route('/universal_dashboard/universal_dashboard', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/universal_dashboard/universal_dashboard/objects', auth='public')
#     def list(self, **kw):
#         return http.request.render('universal_dashboard.listing', {
#             'root': '/universal_dashboard/universal_dashboard',
#             'objects': http.request.env['universal_dashboard.universal_dashboard'].search([]),
#         })

#     @http.route('/universal_dashboard/universal_dashboard/objects/<model("universal_dashboard.universal_dashboard"):obj>', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('universal_dashboard.object', {
#             'object': obj
#         })

