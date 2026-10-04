# GitHub 本地加速

一个 Chrome Manifest V3 扩展，将 GitHub 页面、原始文件和下载资源通过本机 HTTP 代理转发，其它网站保持直连。

## 使用

1. 启动本机代理程序，并确认它提供 HTTP 代理端口（默认 `127.0.0.1:7890`）。
2. 在 Chrome 打开 `chrome://extensions`，启用“开发者模式”，选择“加载已解压的扩展程序”，并选择本目录。
3. 打开扩展弹窗，填写代理地址和端口，然后启用加速。

支持 `github.com`、`githubusercontent.com`、`githubassets.com`、`githubobjects.com` 和 `github.io` 及其子域名。关闭时会清除本扩展设置的代理覆盖；若其它扩展控制了代理设置，启用操作会提示失败。

此扩展只配置浏览器代理，不会启动本机代理服务。请使用可信的本地代理，并确认其 HTTP 代理端口可用。