module.exports = {
  title: "Kubernetes + Knative + GitLab + Harbor",
  description: "Kubernetes + Knative + GitLab + Harbor",
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
          { text: 'GitLab', link: 'https://gitlab.com' },
          { text: 'Harbor', link: 'https://goharbor.io' },
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
      '/part-07/',
      '/part-08/',
      '/part-09/',
      '/part-10/',
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
