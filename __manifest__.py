# -*- coding: utf-8 -*-
{
    'name': "Universal Statistics Dashboard",

    'summary': "Universal Statistics Dashboard",

    'description': """
        Universal Statistics Dashboard
    """,

    'author': "Doodex",
    'website': "https://www.doodex.net",
    'category': 'Uncategorized',
    'version': '0.1',
    'sequence': -1,

    # any module necessary for this one to work correctly
    'depends': ['base', 'crm', 'sale_management', 'account', 'stock', 'purchase', 'account_reports'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/dashboard_homepage_views.xml',
        'views/menu_items.xml'
    ],
    'assets': {
        'web.assets_backend': [
            'Dashboard-Doodex/static/lib/js/*.js',
            'Dashboard-Doodex/static/src/components/**/*',
            'Dashboard-Doodex/static/src/scss/**/*',
            'Dashboard-Doodex/static/src/js/**/*',
            'Dashboard-Doodex/static/src/xml/**/*'
        ],
    },
    'icon': 'Dashboard-Doodex/static/description/icon.png',
    'installable': True,
    'application': True,
}

