# CC Chat UI Sandbox

Sandbox UI dạng chat code agent để cho Command Code / Trae / agent rẻ sửa giao diện mà không đụng repo chính.

## Cách chạy

Mở PowerShell hoặc CMD tại thư mục này:

```bash
npm install
npm run dev
```

Mở:

```txt
http://localhost:5173
```

Hoặc trên Windows bấm đúp `run-sandbox.bat`.

## Cách giao cho Command Code

Trong thư mục này:

```bash
command-code -m "Qwen/Qwen3.7-Max"
```

Sau đó dán nội dung trong file:

```txt
commandcode-prompt.txt
```

## Luật an toàn

- Không chứa key.
- Không chứa database.
- Không chứa backend thật.
- Không deploy.
- Không git push.
- Chỉ dùng để tạo UI/mock rồi soi lại, copy file tốt sang repo chính.
