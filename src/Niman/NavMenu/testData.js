const routes = [
  // app
  {
    path: '/',
    component: '../layouts',
    routes: [{
        path: '/',
        redirect: '/movein'
      },
      {
        path: 'movein',
        icon: 'Controller', // 图标,必须是/components/business/Icons/下的图标组件
        label: '欢迎使用', // 菜单文字
        component: './movein/index.js', // 组件
        hidden: true, // 不显示在菜单中
      },
      {
        icon: 'Pharmacy',
        path: '/pharmacySpecial',
        authName: 'pharmacySpecial',
        dynamic: true,
        label: '药店专题分析',
        routes: [{
          path: '/pharmacySpecial/ydxs',
          authName: 'ydxs',
          label: '药店销售数据分析',
          // dynamic: true,
          component: './pharmacySpecial/ydxs',
          routes: [{
            path: '/hospitalSpecial/hospitalization',
            authName: 'hospitalization',
            label: '住院指标专题分析',
            dynamic: true,
            component: './hospitalSpecial/hospitalization',
            routes: [{
                path: '/hospitalSpecial/rcyrc',
                authName: 'rcyrc',
                dynamic: true,
                label: '入出院人次分析',
                component: './hospitalSpecial/rcyrc',
                routes: [{
                    path: '/hospitalSpecial/ylf',
                    authName: 'ylf',
                    dynamic: true,
                    label: '医疗费分析',
                    component: './hospitalSpecial/ylf',
                  },
                  {
                    path: '/hospitalSpecial/rcfytj',
                    authName: 'rcfytj',
                    dynamic: true,
                    label: '人次费用统计分析',
                    component: './hospitalSpecial/rcfytj',
                  },
                ]
              },
              {
                path: '/hospitalSpecial/zybzfy',
                authName: 'zybzfy',
                label: '住院病种费用分析',
                dynamic: true,
                component: './hospitalSpecial/zybzfy',
              },
            ]
          }, ]
        }, ],
      },

      {
        component: '404',
      },
    ],
  },
];

exports.routes = routes;


const authList = [
  'app',
  'app.pharmacySpecial',
  'app.pharmacySpecial.ydxs',
  'app.pharmacySpecial.ydxs.hospitalization',
  'app.pharmacySpecial.ydxs.hospitalization.rcyrc',
]

exports.authList = authList;