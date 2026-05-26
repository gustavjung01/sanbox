# Command Code Sandbox Launcher
# A simple GUI launcher for the sandbox UI

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Create form
$form = New-Object System.Windows.Forms.Form
$form.Text = "Command Code Sandbox Launcher"
$form.Size = New-Object System.Drawing.Size(500, 600)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.Color]::FromArgb(5, 8, 22)
$form.ForeColor = [System.Drawing.Color]::FromArgb(229, 231, 235)
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox = $false

# Title label
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Command Code Sandbox"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::FromArgb(34, 197, 94)
$titleLabel.AutoSize = $true
$titleLabel.Location = New-Object System.Drawing.Point(20, 20)
$form.Controls.Add($titleLabel)

# Subtitle
$subtitleLabel = New-Object System.Windows.Forms.Label
$subtitleLabel.Text = "Quick launcher for UI sandbox development"
$subtitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$subtitleLabel.ForeColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
$subtitleLabel.AutoSize = $true
$subtitleLabel.Location = New-Object System.Drawing.Point(20, 50)
$form.Controls.Add($subtitleLabel)

# Sandbox path display
$pathLabel = New-Object System.Windows.Forms.Label
$pathLabel.Text = "Sandbox: F:\1_A_Disk_D\Tool\sanbox"
$pathLabel.Font = New-Object System.Drawing.Font("Consolas", 9)
$pathLabel.ForeColor = [System.Drawing.Color]::FromArgb(103, 232, 249)
$pathLabel.AutoSize = $true
$pathLabel.Location = New-Object System.Drawing.Point(20, 80)
$form.Controls.Add($pathLabel)

# Helper function to add log
function Add-Log($message) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    $statusBox.AppendText("[$timestamp] $message`r`n")
}

# Helper function to create buttons
function New-LauncherButton($text, $y, $color) {
    $btn = New-Object System.Windows.Forms.Button
    $btn.Text = $text
    $btn.Location = New-Object System.Drawing.Point(20, $y)
    $btn.Size = New-Object System.Drawing.Size(445, 36)
    $btn.FlatStyle = "Flat"
    $btn.BackColor = $color
    $btn.ForeColor = [System.Drawing.Color]::FromArgb(4, 17, 31)
    $btn.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $btn.FlatAppearance.BorderSize = 0
    $btn.Cursor = "Hand"
    return $btn
}

# Button 1: Open sandbox folder
$btnOpenFolder = New-LauncherButton "Open Sandbox Folder" 110 ([System.Drawing.Color]::FromArgb(229, 231, 235))
$btnOpenFolder.Add_Click({
    Add-Log "Opening sandbox folder..."
    Start-Process "explorer.exe" "F:\1_A_Disk_D\Tool\sanbox"
    Add-Log "Folder opened."
})
$form.Controls.Add($btnOpenFolder)

# Button 2: Start dev server
$btnDevServer = New-LauncherButton "Start Dev Server (npm run dev)" 152 ([System.Drawing.Color]::FromArgb(34, 197, 94))
$btnDevServer.Add_Click({
    Add-Log "Starting dev server on port 5173..."
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell.exe"
    $psi.Arguments = "-NoExit -Command `"cd 'F:\1_A_Disk_D\Tool\sanbox'; npm run dev`""
    $psi.WorkingDirectory = "F:\1_A_Disk_D\Tool\sanbox"
    [System.Diagnostics.Process]::Start($psi)
    Add-Log "Dev server started in new window."
})
$form.Controls.Add($btnDevServer)

# Button 3: Open browser
$btnBrowser = New-LauncherButton "Open Browser (localhost:5173)" 194 ([System.Drawing.Color]::FromArgb(103, 232, 249))
$btnBrowser.Add_Click({
    Add-Log "Opening browser at http://localhost:5173..."
    Start-Process "http://localhost:5173"
    Add-Log "Browser opened."
})
$form.Controls.Add($btnBrowser)

# Button 4: Command Code with Kimi
$btnKimi = New-LauncherButton "Run Command Code - Kimi K2.5" 236 ([System.Drawing.Color]::FromArgb(192, 132, 252))
$btnKimi.Add_Click({
    Add-Log "Launching Command Code with Kimi K2.5..."
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell.exe"
    $psi.Arguments = "-NoExit -Command `"cd 'F:\1_A_Disk_D\Tool\sanbox'; command-code -m 'moonshotai/Kimi-K2.5'`""
    $psi.WorkingDirectory = "F:\1_A_Disk_D\Tool\sanbox"
    [System.Diagnostics.Process]::Start($psi)
    Add-Log "Command Code (Kimi) launched in new window."
})
$form.Controls.Add($btnKimi)

# Model buttons in a row - moved down to avoid overlapping Status/Log
$btnDeepSeek = New-Object System.Windows.Forms.Button
$btnDeepSeek.Text = "DeepSeek"
$btnDeepSeek.Location = New-Object System.Drawing.Point(20, 358)
$btnDeepSeek.Size = New-Object System.Drawing.Size(142, 30)
$btnDeepSeek.FlatStyle = "Flat"
$btnDeepSeek.BackColor = [System.Drawing.Color]::FromArgb(56, 189, 248)
$btnDeepSeek.ForeColor = [System.Drawing.Color]::FromArgb(4, 17, 31)
$btnDeepSeek.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$btnDeepSeek.FlatAppearance.BorderSize = 0
$btnDeepSeek.Cursor = "Hand"
$btnDeepSeek.Add_Click({
    Add-Log "Launching Command Code with DeepSeek..."
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell.exe"
    $psi.Arguments = "-NoExit -Command `"cd 'F:\1_A_Disk_D\Tool\sanbox'; command-code -m 'deepseek/deepseek-v4-flash'`""
    $psi.WorkingDirectory = "F:\1_A_Disk_D\Tool\sanbox"
    [System.Diagnostics.Process]::Start($psi)
    Add-Log "Command Code (DeepSeek) launched in new window."
})
$form.Controls.Add($btnDeepSeek)

$btnQwen = New-Object System.Windows.Forms.Button
$btnQwen.Text = "Qwen"
$btnQwen.Location = New-Object System.Drawing.Point(172, 358)
$btnQwen.Size = New-Object System.Drawing.Size(142, 30)
$btnQwen.FlatStyle = "Flat"
$btnQwen.BackColor = [System.Drawing.Color]::FromArgb(251, 146, 60)
$btnQwen.ForeColor = [System.Drawing.Color]::FromArgb(4, 17, 31)
$btnQwen.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$btnQwen.FlatAppearance.BorderSize = 0
$btnQwen.Cursor = "Hand"
$btnQwen.Add_Click({
    Add-Log "Launching Command Code with Qwen..."
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell.exe"
    $psi.Arguments = "-NoExit -Command `"cd 'F:\1_A_Disk_D\Tool\sanbox'; command-code -m 'Qwen/Qwen3.7-Max'`""
    $psi.WorkingDirectory = "F:\1_A_Disk_D\Tool\sanbox"
    [System.Diagnostics.Process]::Start($psi)
    Add-Log "Command Code (Qwen) launched in new window."
})
$form.Controls.Add($btnQwen)

$btnPrompt = New-Object System.Windows.Forms.Button
$btnPrompt.Text = "Copy Prompt"
$btnPrompt.Location = New-Object System.Drawing.Point(324, 358)
$btnPrompt.Size = New-Object System.Drawing.Size(141, 30)
$btnPrompt.FlatStyle = "Flat"
$btnPrompt.BackColor = [System.Drawing.Color]::FromArgb(167, 139, 250)
$btnPrompt.ForeColor = [System.Drawing.Color]::FromArgb(4, 17, 31)
$btnPrompt.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$btnPrompt.FlatAppearance.BorderSize = 0
$btnPrompt.Cursor = "Hand"
$btnPrompt.Add_Click({
    $promptPath = "F:\1_A_Disk_D\Tool\sanbox\commandcode-prompt.txt"
    if (Test-Path $promptPath) {
        $promptContent = Get-Content -Path $promptPath -Raw
        [System.Windows.Forms.Clipboard]::SetText($promptContent)
        Add-Log "Prompt copied to clipboard from commandcode-prompt.txt!"
    } else {
        Add-Log "Error: commandcode-prompt.txt not found!"
    }
})
$form.Controls.Add($btnPrompt)

# Status/Log area - moved down
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Status / Log"
$statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(134, 239, 172)
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object System.Drawing.Point(20, 400)
$form.Controls.Add($statusLabel)

$statusBox = New-Object System.Windows.Forms.TextBox
$statusBox.Multiline = $true
$statusBox.ScrollBars = "Vertical"
$statusBox.ReadOnly = $true
$statusBox.BackColor = [System.Drawing.Color]::FromArgb(2, 6, 23)
$statusBox.ForeColor = [System.Drawing.Color]::FromArgb(187, 247, 208)
$statusBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$statusBox.Location = New-Object System.Drawing.Point(20, 425)
$statusBox.Size = New-Object System.Drawing.Size(445, 120)
$statusBox.BorderStyle = "FixedSingle"
$form.Controls.Add($statusBox)

# Initial log
Add-Log "Launcher ready. Sandbox: F:\1_A_Disk_D\Tool\sanbox"

# Show form
[void]$form.ShowDialog()
