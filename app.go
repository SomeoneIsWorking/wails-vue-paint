package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.design/x/clipboard"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize clipboard
	err := clipboard.Init()
	if err != nil {
		fmt.Printf("Failed to initialize clipboard: %v\n", err)
	}
}

// getStateFilePath returns the path to the state file
func (a *App) getStateFilePath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %w", err)
	}

	stateDir := filepath.Join(homeDir, "Pictures", "PaintApp")
	if err := os.MkdirAll(stateDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	return filepath.Join(stateDir, "state.json"), nil
}

// SaveImage saves a base64 encoded image to the user's Pictures directory
func (a *App) SaveImage(base64Data string, format string) (string, error) {
	// Remove data URL prefix if present (e.g., "data:image/png;base64,")
	if strings.Contains(base64Data, ",") {
		parts := strings.Split(base64Data, ",")
		if len(parts) == 2 {
			base64Data = parts[1]
		}
	}

	// Decode base64
	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", fmt.Errorf("failed to decode image: %w", err)
	}

	// Validate format
	validFormats := map[string]bool{
		"png":  true,
		"jpg":  true,
		"jpeg": true,
		"webp": true,
	}
	if !validFormats[strings.ToLower(format)] {
		format = "png" // Default to PNG
	}

	// Generate filename with timestamp
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("paint_%s.%s", timestamp, format)

	// Get user's Pictures directory
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %w", err)
	}

	picturesDir := filepath.Join(homeDir, "Pictures", "PaintApp")

	// Create directory if it doesn't exist
	if err := os.MkdirAll(picturesDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	fullPath := filepath.Join(picturesDir, filename)

	// Write file
	if err := os.WriteFile(fullPath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	return fullPath, nil
}

// GetAppVersion returns the application version
func (a *App) GetAppVersion() string {
	return "1.0.0"
}

// GetSaveDirectory returns the default save directory
func (a *App) GetSaveDirectory() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %w", err)
	}

	picturesDir := filepath.Join(homeDir, "Pictures", "PaintApp")

	// Create directory if it doesn't exist
	if err := os.MkdirAll(picturesDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	return picturesDir, nil
}

// GetClipboardImage reads an image from the system clipboard and returns it as base64
func (a *App) GetClipboardImage() (string, error) {
	fmt.Println("[GetClipboardImage] Starting clipboard read...")

	// Read image from clipboard
	imageData := clipboard.Read(clipboard.FmtImage)
	if len(imageData) == 0 {
		fmt.Println("[GetClipboardImage] No image data in clipboard")
		return "", fmt.Errorf("no image in clipboard")
	}

	fmt.Printf("[GetClipboardImage] Read %d bytes from clipboard\n", len(imageData))

	// Encode to base64
	base64Data := base64.StdEncoding.EncodeToString(imageData)
	fmt.Printf("[GetClipboardImage] Encoded to base64, length: %d\n", len(base64Data))

	// Return as data URL
	result := "data:image/png;base64," + base64Data
	fmt.Printf("[GetClipboardImage] Returning data URL, total length: %d\n", len(result))
	return result, nil
}

// Log logs a message from the frontend to the Go console
func (a *App) Log(message string) {
	fmt.Printf("[Frontend] %s\n", message)
}

// SaveState saves the application state to disk
func (a *App) SaveState(stateJSON string) error {
	stateFile, err := a.getStateFilePath()
	if err != nil {
		return fmt.Errorf("failed to get state file path: %w", err)
	}

	// Validate JSON before saving
	var temp interface{}
	if err := json.Unmarshal([]byte(stateJSON), &temp); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}

	// Write to file
	if err := os.WriteFile(stateFile, []byte(stateJSON), 0644); err != nil {
		return fmt.Errorf("failed to write state file: %w", err)
	}

	fmt.Printf("[SaveState] State saved successfully to %s\n", stateFile)
	return nil
}

// LoadState loads the application state from disk
func (a *App) LoadState() (string, error) {
	stateFile, err := a.getStateFilePath()
	if err != nil {
		return "", fmt.Errorf("failed to get state file path: %w", err)
	}

	// Check if file exists
	if _, err := os.Stat(stateFile); os.IsNotExist(err) {
		fmt.Println("[LoadState] No saved state found")
		return "", nil // Return empty string, not an error
	}

	// Read file
	data, err := os.ReadFile(stateFile)
	if err != nil {
		return "", fmt.Errorf("failed to read state file: %w", err)
	}

	fmt.Printf("[LoadState] State loaded successfully from %s\n", stateFile)
	return string(data), nil
}

// CanvasSize represents canvas dimensions
type CanvasSize struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// ShowCanvasSizeMenu displays a menu for canvas size selection
func (a *App) ShowCanvasSizeMenu(x int, y int) (CanvasSize, error) {
	// This is a placeholder that returns a default size
	// The actual menu will be handled via Wails events from frontend
	return CanvasSize{Width: 800, Height: 600}, nil
}
