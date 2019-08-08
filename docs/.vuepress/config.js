module.exports = {
  title: "Kubernetes + Knative + Gitlab + Harbor",
  description: "Kubernetes + Knative + Gitlab + Harbor",
  base: '/k8s-knative-gitlab-harbor/',
  head: [
    ['link', { rel: "icon", href: "https://kubernetes.io/images/favicon.png" }]
  ],
  themeConfig: {
    displayAllHeaders: true,
    lastUpdated: true,
    repo: 'ruzickap/k8s-knative-gitlab-harbor',
    docsDir: 'docs',
    editLinks: true,
    logo: 'https://kubernetes.io/images/favicon.png',
    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Links',
        items: [
          { text: 'Harbor', link: 'https://goharbor.io' },
          { text: 'Gitlab', link: 'https://gitlab.com' },
          { text: 'Knative', link: 'https://cloud.google.com/knative' },
        ]
      }
    ],
    sidebar: [
      '/',
      '/part-01/',
      '/part-02/',
      '/part-03/',
      '/part-04/',
      '/part-05/',
      '/part-06/',
    ]
  },
  plugins: [
    ['@vuepress/medium-zoom'],
    ['@vuepress/back-to-top'],
    ['reading-progress'],
    ['smooth-scroll'],
    ['seo']
  ]
}
