# 🏛️ VR Музей — Система управления экспонатами

## 📋 Обзор

Этот модуль добавляет в VR-музей систему автоматического размещения экспонатов (картин и 3D-моделей) с проверкой коллизий и конфигурацией через JSON.

**Технологии:** A-Frame 1.5.0, Three.js, JavaScript ES6+

---

## 📁 Структура файлов

```
/workspace/
├── VR2.html                    # Основной файл музея (изменён)
├── exhibit-manager.js          # Новый: компонент управления экспонатами
├── exhibits-config.json        # Новый: конфигурация экспонатов
├── README_EXHIBITS.md          # Этот файл
└── models/                     # Папка для 3D-моделей (создать)
    ├── cannon.glb
    ├── anchor.glb
    └── amphora.glb
```

---

## 🔧 Что было изменено/добавлено

### Изменённые файлы:
| Файл | Изменения |
|------|-----------|
| `VR2.html` | Добавлен скрипт `exhibit-manager.js`, компонент `<a-entity exhibit-manager>` |

### Новые файлы:
| Файл | Назначение |
|------|------------|
| `exhibit-manager.js` | A-Frame компонент для загрузки конфигурации, проверки коллизий, размещения экспонатов |
| `exhibits-config.json` | JSON-конфигурация с метаданными картин и 3D-моделей |

---

## 📄 Пример конфигурации (`exhibits-config.json`)

```json
{
  "museumSettings": {
    "roomWidth": 30,
    "roomLength": 50,
    "wallOffset": 14.7,
    "centerZoneRadius": 8,
    "minSpacingBetweenObjects": 2.5,
    "paintingHeight": 2.8
  },
  "paintings": [
    {
      "id": "painting_001",
      "title": "Анапа. Вид на крепостные ворота",
      "artist": "Иван Айвазовский",
      "year": 1839,
      "location": "left_wall",
      "position": { "x": -14.7, "y": 2.8, "z": -20 },
      "rotation": { "x": 0, "y": 90, "z": 0 },
      "url": "https://example.com/image.jpg",
      "maxWidth": 4.5,
      "maxHeight": 3.5,
      "description": "<h3>О картине</h3><p>Описание...</p>",
      "sourceUrl": "https://tretyakovgallery.ru/",
      "occupied": false
    }
  ],
  "models3D": [
    {
      "id": "model_001",
      "title": "Пушка времён Русско-турецких войн",
      "artist": "Мастера Тульского оружейного завода",
      "year": 1790,
      "type": "cannon",
      "position": { "x": -3, "y": 0.6, "z": -5 },
      "rotation": { "x": 0, "y": 45, "z": 0 },
      "scale": { "x": 1, "y": 1, "z": 1 },
      "url": "models/cannon.glb",
      "description": "<h3>О экспонате</h3><p>Описание...</p>",
      "boundingSphere": { "radius": 1.5, "height": 1.2 },
      "lodLevels": [
        { "distance": 0, "url": "models/cannon_high.glb" },
        { "distance": 5, "url": "models/cannon_medium.glb" },
        { "distance": 15, "url": "models/cannon_low.glb" }
      ]
    }
  ]
}
```

---

## 🚀 Локальный запуск и тестирование

### 1. Запуск локального сервера
```bash
cd /workspace
python3 -m http.server 8000
```
Или используйте Node.js:
```bash
npx serve .
```

### 2. Откройте в браузере
Перейдите по адресу: `http://localhost:8000/VR2.html`

### 3. Проверка работы
- **Картины:** Наведите курсор на картину → кликните → откроется информационное окно
- **3D модели:** Кликните на модель → появится описание
- **Консоль:** Откройте DevTools (F12) → вкладка Console → убедитесь, что нет ошибок

### 4. Тестирование размещения новых экспонатов
Откройте консоль браузера и выполните:
```javascript
// Добавить новую картину
ExhibitManager.addPainting({
  title: "Новая картина",
  artist: "Художник",
  year: 2024,
  location: "left_wall",
  url: "https://example.com/new.jpg",
  maxWidth: 4,
  maxHeight: 3.5,
  description: "<h3>Описание</h3><p>Текст...</p>"
});

// Добавить новую 3D модель
ExhibitManager.add3DModel({
  title: "Новая модель",
  artist: "Автор",
  year: 2024,
  url: "models/new-model.glb",
  boundingSphere: { radius: 1.5, height: 1.0 },
  description: "<h3>Описание</h3><p>Текст...</p>"
});
```

---

## 🎯 Ключевые функции

### 1. Автоматический поиск свободного места
- **Для картин:** Сканирует стены слева/справа/сзади, проверяет расстояние до других картин
- **Для 3D моделей:** Спиральный поиск от центра зала с учётом радиуса модели

### 2. Проверка коллизий
- **Grid-based:** Сетка занятости (cellSize = 1м)
- **Sphere collision:** Проверка расстояния между центрами объектов
- **Min spacing:** Минимальное расстояние между объектами (2.5м)

### 3. Информационные панели
- Клик на объект → модальное окно с описанием
- Адаптивный дизайн, закрытие по клику вне области
- Поддержка HTML-форматирования в описании

### 4. LOD (Levels of Detail) для 3D моделей
- Автоматическая подгрузка моделей разного качества в зависимости от расстояния
- Оптимизация производительности

---

## 📦 Создание Pull Request в GitHub

### 1. Инициализация репозитория (если ещё не сделано)
```bash
cd /workspace
git init
git add .
git commit -m "Initial commit: VR Museum base"
```

### 2. Создание ветки для изменений
```bash
git checkout -b feature/add-exhibit-management
```

### 3. Добавление файлов
```bash
git add exhibits-config.json exhibit-manager.js VR2.html README_EXHIBITS.md
git commit -m "feat: добавить систему управления экспонатами

- Новый компонент exhibit-manager.js для автоматического размещения
- Конфигурационный файл exhibits-config.json с метаданными
- Проверка коллизий (grid + sphere collision)
- Информационные панели для картин и 3D моделей
- Поддержка LOD для оптимизации производительности
- API для динамического добавления экспонатов

Closes #123"
```

### 4. Push и создание PR
```bash
git push origin feature/add-exhibit-management
```

Затем на GitHub:
1. Перейдите в репозиторий
2. Нажмите "Compare & pull request"
3. Заполните описание:
   - **Заголовок:** `feat: Система управления экспонатами с проверкой коллизий`
   - **Описание:** 
     ```
     ## Изменения
     - Добавлен модуль exhibit-manager.js
     - Создан конфигурационный файл exhibits-config.json
     - Реализована проверка пересечений (bounding-box + grid)
     - Добавлены информационные панели с HTML-описанием
     
     ## Тестирование
     - Локальный запуск: python3 -m http.server 8000
     - Проверка в браузере: http://localhost:8000/VR2.html
     - Тесты API через консоль браузера
     
     ## Совместимость
     - A-Frame 1.5.0
     - Three.js (встроен в A-Frame)
     - Современные браузеры (Chrome, Firefox, Edge)
     ```
4. Нажмите "Create pull request"

---

## ⚡ Оптимизация и рекомендации

### 1. Оптимизация текстур
- Используйте формат `.jpg` для картин (качество 80-85%)
- Максимальный размер: 2048×2048 px для десктопа, 1024×1024 для мобильных
- Генерируйте mipmaps заранее или включите в коде

### 2. LOD для 3D моделей
```json
"lodLevels": [
  { "distance": 0, "url": "models/object_high.glb" },
  { "distance": 5, "url": "models/object_medium.glb" },
  { "distance": 15, "url": "models/object_low.glb" }
]
```

### 3. Расширение коллекции
1. Откройте `exhibits-config.json`
2. Добавьте новый объект в массив `paintings` или `models3D`
3. Убедитесь, что `occupied: false`
4. Сохраните и обновите страницу

### 4. Производительность
- Не более 20 картин одновременно на стенах
- Не более 10 3D моделей с высоким полигонажем
- Используйте `debugMode: true` для отладки сетки занятости

---

## 🛠️ API для разработчиков

### Глобальные методы
```javascript
// Добавить картину
ExhibitManager.addPainting({
  title: string,
  artist: string,
  year: number,
  location: 'left_wall' | 'right_wall' | 'back_wall',
  url: string,
  maxWidth: number,
  maxHeight: number,
  description: string
}): boolean

// Добавить 3D модель
ExhibitManager.add3DModel({
  title: string,
  artist: string,
  year: number,
  url: string,
  boundingSphere: { radius: number, height: number },
  description: string
}): boolean
```

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте консоль браузера на ошибки
2. Убедитесь, что пути к файлам указаны верно
3. Для 3D моделей проверьте формат (.glb/.gltf)
4. Отключите `debugMode` в продакшене

---

**Версия:** 1.0.0  
**Дата:** 2024  
**Совместимость:** A-Frame 1.5.0+
