"""
HNbus 本地开发服务器
- 提供静态文件服务（index.html, css/, js/）
- 代理 busApi 请求到 zjdyx.cn（绕过 CORS）

用法: python server.py [端口]
默认端口: 8080
"""
import http.server
import urllib.request
import urllib.error
import json
import sys
import os
import ssl
import re

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
PROXY_BASE = "https://www.zjdyx.cn"
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

# 允许的不安全 HTTPS（zjdyx.cn 可能证书有问题）
SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

class HNBusHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def do_GET(self):
        # API 代理路由
        if self.path.startswith('/api/bus/'):
            self._proxy_api('GET')
            return
        super().do_GET()

    def do_POST(self):
        # API 代理路由
        if self.path.startswith('/api/bus/'):
            self._proxy_api('POST')
            return
        super().do_POST()

    def do_OPTIONS(self):
        """处理 CORS 预检请求"""
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, xweb_xhr')

    def _proxy_api(self, method):
        """代理转发到 zjdyx.cn"""
        # 解析路径：/api/bus/line?gprsId=11&sessionID=xxx
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == '/api/bus/line':
            query = urllib.parse.parse_qs(parsed.query)
            gprs_id = query.get('gprsId', [None])[0]
            session_id = query.get('sessionID', [''])[0]
            target_url = f"{PROXY_BASE}/WXMP_BusInfo/GetLineDetialByGprsid?sessionID={session_id}"
            req_body = json.dumps({"gprsId": str(gprs_id), "dir": "true"}).encode()
        elif parsed.path == '/api/bus/shift':
            query = urllib.parse.parse_qs(parsed.query)
            gprs_id = query.get('gprsId', [None])[0]
            session_id = query.get('sessionID', [''])[0]
            target_url = f"{PROXY_BASE}/WXMP_BusInfo/GetLineShiftListByGprsid?sessionID={session_id}"
            req_body = json.dumps({"gprsId": str(gprs_id), "dir": "false"}).encode()
        else:
            self.send_error(404, 'Unknown API endpoint')
            return

        if not gprs_id:
            self.send_error(400, 'Missing gprsId')
            return

        try:
            req = urllib.request.Request(
                target_url,
                data=req_body,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0',
                    'xweb_xhr': '1',
                    'Referer': 'https://servicewechat.com/wx2c04dce60bfff2cb/33/page-frame.html'
                },
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=15, context=SSL_CONTEXT) as resp:
                data = resp.read()
                self.send_response(200)
                self._cors_headers()
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', len(data))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(str(e).encode())
        except Exception as e:
            self.send_response(502)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def log_message(self, format, *args):
        # 简洁日志
        if '/api/' in str(args[0]):
            print(f"[proxy] {args[0]}")
        else:
            pass  # 静默静态文件请求


if __name__ == '__main__':
    print(f"""
╔══════════════════════════════════════╗
║   HNbus 公交线路查询服务器           ║
║   海宁公共交通线路查询 ©HNMRXZ        ║
╠══════════════════════════════════════╣
║   地址: http://localhost:{PORT:<5}        ║
║   API代理: zjdyx.cn (CORS已绕过)     ║
║   按 Ctrl+C 停止服务器               ║
╚══════════════════════════════════════╝
""")
    server = http.server.HTTPServer(('0.0.0.0', PORT), HNBusHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
        server.server_close()
