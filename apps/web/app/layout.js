import "./globals.css"

export const metadata = {
  title: "psyche",
  description: "psyche 多智能体聊天界面（Next.js）"
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
