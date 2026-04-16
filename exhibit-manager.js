/**
 * VR Museum Exhibit Manager
 * Модуль для управления экспонатами: загрузка конфигурации, проверка коллизий, размещение
 * Совместим с A-Frame 1.5.0
 */

AFRAME.registerComponent('exhibit-manager', {
  schema: {
    configUrl: { type: 'string', default: 'exhibits-config.json' },
    debugMode: { type: 'boolean', default: false }
  },

  init: function () {
    this.config = null;
    this.occupancyGrid = new Map();
    this.placedPaintings = [];
    this.placedModels = [];
    this.cellSize = 1.0;
    
    // Загрузка конфигурации
    this.loadConfig();
  },

  /**
   * Загрузка JSON конфигурации
   */
  loadConfig: async function () {
    try {
      const response = await fetch(this.data.configUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.config = await response.json();
      
      if (this.config.museumSettings) {
        this.cellSize = this.config.collisionGrid?.cellSize || 1.0;
      }
      
      console.log('[ExhibitManager] Конфигурация загружена:', this.config);
      
      // Инициализация сетки занятости
      this.initializeOccupancyGrid();
      
      // Размещение экспонатов
      this.placeAllExhibits();
      
    } catch (error) {
      console.error('[ExhibitManager] Ошибка загрузки конфигурации:', error);
    }
  },

  /**
   * Инициализация сетки занятости для проверки коллизий
   */
  initializeOccupancyGrid: function () {
    if (!this.config || !this.config.collisionGrid?.enabled) return;
    
    const settings = this.config.museumSettings;
    const halfWidth = Math.ceil(settings.roomWidth / 2 / this.cellSize);
    const halfLength = Math.ceil(settings.roomLength / 2 / this.cellSize);
    
    for (let x = -halfWidth; x <= halfWidth; x++) {
      for (let z = -halfLength; z <= halfLength; z++) {
        const key = `${x},${z}`;
        this.occupancyGrid.set(key, false);
      }
    }
    
    console.log('[ExhibitManager] Сетка занятости инициализирована');
  },

  /**
   * Проверка, свободна ли ячейка
   */
  isCellFree: function (x, z) {
    const key = `${Math.round(x / this.cellSize)},${Math.round(z / this.cellSize)}`;
    return this.occupancyGrid.get(key) === false || this.occupancyGrid.get(key) === undefined;
  },

  /**
   * Mark cells as occupied
   */
  markCellsOccupied: function (x, z, radius) {
    const cellsRadius = Math.ceil(radius / this.cellSize);
    const centerX = Math.round(x / this.cellSize);
    const centerZ = Math.round(z / this.cellSize);
    
    for (let dx = -cellsRadius; dx <= cellsRadius; dx++) {
      for (let dz = -cellsRadius; dz <= cellsRadius; dz++) {
        const dist = Math.sqrt(dx * dx + dz * dz) * this.cellSize;
        if (dist <= radius) {
          const key = `${centerX + dx},${centerZ + dz}`;
          this.occupancyGrid.set(key, true);
        }
      }
    }
  },

  /**
   * Проверка столкновений между двумя позициями (sphere collision)
   */
  checkCollision: function (pos1, radius1, pos2, radius2) {
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance < (radius1 + radius2);
  },

  /**
   * Поиск свободного места на стене для картины
   */
  findFreeWallPosition: function (wall, minWidth, minHeight, existingPaintings) {
    const settings = this.config.museumSettings;
    const wallOffset = settings.wallOffset;
    const paintingHeight = settings.paintingHeight;
    const minSpacing = settings.minSpacingBetweenObjects;
    
    // Параметры стены
    let wallPositions = [];
    if (wall === 'left_wall') {
      wallPositions = Array.from({ length: 40 }, (_, i) => ({
        x: -wallOffset,
        y: paintingHeight,
        z: -20 + i,
        rotation: { x: 0, y: 90, z: 0 }
      }));
    } else if (wall === 'right_wall') {
      wallPositions = Array.from({ length: 40 }, (_, i) => ({
        x: wallOffset,
        y: paintingHeight,
        z: -20 + i,
        rotation: { x: 0, y: -90, z: 0 }
      }));
    } else if (wall === 'back_wall') {
      wallPositions = Array.from({ length: 28 }, (_, i) => ({
        x: -14 + i,
        y: paintingHeight,
        z: -settings.roomLength / 2,
        rotation: { x: 0, y: 0, z: 0 }
      }));
    }
    
    // Проверка каждой позиции
    for (const pos of wallPositions) {
      let isFree = true;
      
      // Проверка на пересечение с уже размещёнными картинами
      for (const placed of existingPaintings) {
        if (placed.location === wall) {
          const distance = Math.abs(pos.z - placed.position.z);
          if (distance < (minWidth + 2)) {
            isFree = false;
            break;
          }
        }
      }
      
      // Проверка по сетке занятости
      if (isFree && !this.isCellFree(pos.x, pos.z)) {
        isFree = false;
      }
      
      if (isFree) {
        return pos;
      }
    }
    
    return null; // Нет свободного места
  },

  /**
   * Поиск свободного места в центральной зоне для 3D модели
   */
  findFreeCenterPosition: function (boundingRadius, existingModels) {
    const settings = this.config.museumSettings;
    const centerRadius = settings.centerZoneRadius;
    const minSpacing = settings.minSpacingBetweenObjects;
    
    // Спиральный поиск от центра
    const maxRadius = centerRadius - boundingRadius - 1;
    const step = 0.5;
    
    for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
      for (let radius = 1; radius <= maxRadius; radius += step) {
        const x = Math.cos(angle) * radius;
        const z = -5 + Math.sin(angle) * radius; // Смещение назад от входа
        
        // Проверка границ центральной зоны
        if (Math.sqrt(x * x + z * z) > maxRadius) continue;
        
        // Проверка коллизий с другими моделями
        let collision = false;
        for (const model of existingModels) {
          if (this.checkCollision(
            { x, z },
            boundingRadius + minSpacing,
            model.position,
            model.boundingSphere?.radius || 1.5
          )) {
            collision = true;
            break;
          }
        }
        
        // Проверка по сетке
        if (!collision && this.isCellFree(x, z)) {
          return {
            x: x,
            y: 0,
            z: z,
            rotation: { x: 0, y: angle * (180 / Math.PI), z: 0 }
          };
        }
      }
    }
    
    return null;
  },

  /**
   * Размещение всех экспонатов из конфигурации
   */
  placeAllExhibits: function () {
    if (!this.config) return;
    
    // Размещение картин
    if (this.config.paintings) {
      for (const painting of this.config.paintings) {
        if (!painting.occupied && painting.url) {
          this.placePainting(painting);
        }
      }
    }
    
    // Размещение 3D моделей
    if (this.config.models3D) {
      for (const model of this.config.models3D) {
        this.place3DModel(model);
      }
    }
  },

  /**
   * Размещение картины
   */
  placePainting: function (paintingData) {
    const entity = document.createElement('a-entity');
    
    // Позиционирование
    entity.setAttribute('position', paintingData.position);
    entity.setAttribute('rotation', paintingData.rotation);
    
    // Атрибуты для auto-frame компонента
    const autoFrameAttrs = `
      url: ${paintingData.url};
      title: ${paintingData.title};
      artist: ${paintingData.artist}, ${paintingData.year};
      description: ${paintingData.description.replace(/"/g, '&quot;')};
      maxWidth: ${paintingData.maxWidth};
      maxHeight: ${paintingData.maxHeight}
    `;
    entity.setAttribute('auto-frame', autoFrameAttrs);
    
    // Добавление ID для ссылки
    entity.setAttribute('id', paintingData.id);
    entity.classList.add('clickable');
    
    // Добавление в сцену
    const scene = document.querySelector('a-scene');
    scene.appendChild(entity);
    
    // Пометка как размещённая
    this.placedPaintings.push(paintingData);
    this.markCellsOccupied(paintingData.position.x, paintingData.position.z, 2);
    
    console.log(`[ExhibitManager] Картина размещена: ${paintingData.title}`);
  },

  /**
   * Размещение 3D модели
   */
  place3DModel: function (modelData) {
    const entity = document.createElement('a-entity');
    
    // Позиционирование
    entity.setAttribute('position', modelData.position);
    entity.setAttribute('rotation', modelData.rotation);
    entity.setAttribute('scale', modelData.scale);
    entity.setAttribute('id', modelData.id);
    entity.classList.add('clickable');
    
    // Загрузка 3D модели (glTF/glb)
    const modelEntity = document.createElement('a-entity');
    modelEntity.setAttribute('gltf-model', modelData.url);
    modelEntity.setAttribute('class', 'clickable');
    
    // Настройка LOD (Levels of Detail)
    if (modelData.lodLevels && modelData.lodLevels.length > 1) {
      modelEntity.setAttribute('lod', '');
      modelData.lodLevels.forEach((lod, index) => {
        const lodEntity = document.createElement('a-entity');
        lodEntity.setAttribute('gltf-model', lod.url);
        lodEntity.setAttribute('data-lod-level', index);
        lodEntity.setAttribute('data-lod-distance', lod.distance);
        modelEntity.appendChild(lodEntity);
      });
    }
    
    entity.appendChild(modelEntity);
    
    // Пьедестал (если указан)
    if (modelData.pedestal?.enabled) {
      const pedestal = document.createElement('a-box');
      pedestal.setAttribute('width', '1.5');
      pedestal.setAttribute('height', modelData.pedestal.height);
      pedestal.setAttribute('depth', '1.5');
      pedestal.setAttribute('position', `0 ${modelData.pedestal.height / 2} 0`);
      pedestal.setAttribute('material', `color: ${modelData.pedestal.color}; roughness: 0.4; metalness: 0.1`);
      entity.appendChild(pedestal);
      
      // Корректировка позиции модели
      modelEntity.setAttribute('position', `0 ${modelData.pedestal.height} 0`);
    }
    
    // Добавление данных для информационного окна
    entity.addEventListener('click', () => {
      showPaintingInfo(modelData.title, modelData.artist, modelData.description);
    });
    
    // Hover эффект
    entity.addEventListener('mouseenter', () => {
      document.body.style.cursor = 'pointer';
    });
    entity.addEventListener('mouseleave', () => {
      document.body.style.cursor = 'default';
    });
    
    // Добавление в сцену
    const scene = document.querySelector('a-scene');
    scene.appendChild(entity);
    
    // Пометка как размещённая
    this.placedModels.push(modelData);
    this.markCellsOccupied(
      modelData.position.x,
      modelData.position.z,
      modelData.boundingSphere?.radius || 1.5
    );
    
    console.log(`[ExhibitManager] 3D модель размещена: ${modelData.title}`);
  },

  /**
   * Динамическое добавление новой картины с проверкой коллизий
   */
  addNewPainting: function (paintingData) {
    const position = this.findFreeWallPosition(
      paintingData.location || 'left_wall',
      paintingData.maxWidth || 4,
      paintingData.maxHeight || 3.5,
      this.placedPaintings
    );
    
    if (position) {
      paintingData.position = position;
      paintingData.occupied = true;
      this.placePainting(paintingData);
      this.placedPaintings.push(paintingData);
      return true;
    }
    
    console.warn('[ExhibitManager] Не найдено свободного места для картины');
    return false;
  },

  /**
   * Динамическое добавление новой 3D модели с проверкой коллизий
   */
  addNew3DModel: function (modelData) {
    const boundingRadius = modelData.boundingSphere?.radius || 1.5;
    const position = this.findFreeCenterPosition(boundingRadius, this.placedModels);
    
    if (position) {
      modelData.position = position;
      this.place3DModel(modelData);
      this.placedModels.push(modelData);
      return true;
    }
    
    console.warn('[ExhibitManager] Не найдено свободного места для 3D модели');
    return false;
  }
});

// Глобальная функция для показа информации (уже существует в VR2.html)
// Экспорт для внешнего использования
window.ExhibitManager = {
  addPainting: function (data) {
    const manager = document.querySelector('[exhibit-manager]');
    if (manager && manager.components['exhibit-manager']) {
      return manager.components['exhibit-manager'].addNewPainting(data);
    }
    return false;
  },
  
  add3DModel: function (data) {
    const manager = document.querySelector('[exhibit-manager]');
    if (manager && manager.components['exhibit-manager']) {
      return manager.components['exhibit-manager'].addNew3DModel(data);
    }
    return false;
  }
};
