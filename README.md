# Cinema GraphQL API (NestJS + MongoDB + Apollo)

Домашнє завдання №5 курсу «Back-end розробка з Node.js (NestJS)».

Той самий сервіс кінотеатру, що й у ДЗ_3, але клієнт звертається до нього через
**GraphQL** замість REST. Дані та бізнес-правила не змінилися: сервіс працює з
трьома колекціями MongoDB — `films`, `halls`, `showings`, — а місця (`seats`) і
бронювання (`bookings`) зберігаються вкладеними в документ сеансу. Правило про
подвійне бронювання діє тим самим механізмом: **одне атомарне оновлення
документа сеансу** з перевіркою вільних місць.

Стартова точка — код ДЗ_3 на MongoDB. Контролери REST і Swagger видалені:
єдиний публічний інтерфейс — GraphQL. Автентифікації в цій роботі немає навмисно.

---

## Технології

- **NestJS 11**, **@nestjs/graphql** + **@nestjs/apollo** (драйвер Apollo), **code-first**
- **MongoDB** через **Mongoose 8** (`@nestjs/mongoose`)
- **DataLoader** — для розв'язання проблеми N+1 на вкладених полях `film` і `hall`
- **class-validator** / **class-transformer** — валідація вхідних типів
- **Jest** + **supertest** — e2e-тести, що виконують GraphQL-операції проти реальної MongoDB

---

## Швидкий старт

```bash
# 1. Залежності
npm install

# 2. Підняти MongoDB через Docker Compose
docker compose up -d

# 3. Файл оточення (скопіювати приклад і за потреби відредагувати)
cp .env.example .env

# 4. Заповнити базу тестовими даними
npm run seed

# 5. Запуск у режимі розробки
npm run start:dev
```

Після старту GraphQL-ендпоінт і пісочниця Apollo доступні за адресою:

**http://localhost:3000/graphql**

Відкрийте її у браузері — завантажиться Apollo Sandbox з інтроспекцією схеми,
де можна виконувати запити й мутації. Готові приклади операцій — у файлі
[`operations.graphql`](./operations.graphql).

---

## Змінні оточення

Приклад — у файлі [`.env.example`](./.env.example):

```dotenv
# Порт HTTP-сервера
PORT=3000

# Рядок підключення до MongoDB з назвою бази (обов'язковий).
# docker-compose.yml публікує MongoDB на localhost:27017.
MONGODB_URI=mongodb://localhost:27017/cinema

# База для e2e-тестів; тести її очищають (необов'язкова, це значення за замовчуванням)
MONGODB_TEST_URI=mongodb://localhost:27017/cinema_test

# Порт хоста для контейнера MongoDB (необов'язковий, використовує docker-compose.yml)
MONGO_PORT=27017
```

Оточення перевіряється один раз на старті (`ConfigModule` + `class-validator`):
якщо `MONGODB_URI` відсутній або некоректний, застосунок не запускається.
Файл `.env` до репозиторію не потрапляє (див. `.gitignore`).

---

## Схема

Схема будується підходом **code-first**: класи з декораторами описують типи,
а SDL генерується з них автоматично при старті у файл
[`src/schema.gql`](./src/schema.gql), який **присутній у репозиторії**. Шлях до
згенерованого файла задано в конфігурації `GraphQLModule` (`app.module.ts`).

Ключові типи: `Film`, `Hall`, `Showing`, `Seat`, `BookedSeat`, `Booking`,
`ShowingPage`, перелік `SortOrder`. `_id` документа віддається як поле схеми
`id` у рядковому вигляді. Поля `film` і `hall` типу `Showing` мають тип
об'єкта (`Film!` / `Hall!`), а не ідентифікатора.

### Запити (Queries)

| Запит | Повертає |
| --- | --- |
| `films: [Film!]!` | усі фільми |
| `film(id: ID!): Film` | фільм або `null` |
| `halls: [Hall!]!` | усі зали |
| `hall(id: ID!): Hall` | зал або `null` |
| `showings(filmId, date, page, limit, sort): ShowingPage!` | сторінка сеансів з фільтрами й сортуванням |
| `showing(id: ID!): Showing` | сеанс або `null` |
| `bookings: [Booking!]!` | усі бронювання сервісу |

Аргумент `date` — у форматі `YYYY-MM-DD` (доба в UTC), `filmId` — лише сеанси
цього фільму; обидва застосовуються разом. Сортування — за часом початку
(`sort`), однаковий час впорядковується за ідентифікатором. Аргументи запиту
`showings` зібрані в один клас з декоратором `@ArgsType`.

### Мутації (Mutations)

| Мутація | Поведінка |
| --- | --- |
| `createFilm(input): Film!` | створює фільм |
| `updateFilm(id, input): Film!` | оновлює; `NOT_FOUND`, якщо фільму немає |
| `deleteFilm(id): Boolean!` | `NOT_FOUND`, якщо немає; `CONFLICT`, якщо є сеанси |
| `createHall(input): Hall!` | `CONFLICT`, якщо назва вже існує |
| `deleteHall(id): Boolean!` | `NOT_FOUND` / `CONFLICT` (є сеанси) |
| `createShowing(input): Showing!` | заповнює `seats` за схемою залу; `NOT_FOUND`, якщо немає фільму/залу; `BAD_USER_INPUT`, якщо `startsAt` у минулому або `price` не додатне ціле |
| `createBooking(showingId, seats): Booking!` | `NOT_FOUND` / `BAD_USER_INPUT` / `CONFLICT` |
| `cancelBooking(id): Boolean!` | звільняє місця; `NOT_FOUND`, якщо бронювання немає |

---

## Приклад: сторінка сеансів з назвами фільмів

```graphql
query ShowingsPage {
  showings(page: 1, limit: 20, sort: ASC) {
    items {
      id
      startsAt
      price
      film {
        title
      }
      hall {
        name
      }
    }
    total
    page
    limit
  }
}
```

Відповідь (скорочено):

```json
{
  "data": {
    "showings": {
      "items": [
        {
          "id": "6650f1a2b3c4d5e6f7a8b9c0",
          "startsAt": "2030-01-15T18:00:00.000Z",
          "price": 15000,
          "film": { "title": "Interstellar" },
          "hall": { "name": "Red Hall" }
        }
      ],
      "total": 4,
      "page": 1,
      "limit": 20
    }
  }
}
```

---

## Проблема N+1 — обраний спосіб: DataLoader

Поля `film` і `hall` типу `Showing` розкриваються **резолверами полів**
(`@ResolveField`). Без додаткових заходів запит сторінки з двадцяти сеансів
покликав би резолвер поля `film` двадцять разів — тобто **двадцять один** запит
до бази (один на список сеансів + по одному на кожен фільм). Це і є проблема N+1.

У цій роботі вона розв'язана через **DataLoader** (`src/common/loaders`):

- резолвери полів `film`/`hall` не ходять у базу самі — вони лише додають
  ідентифікатор у чергу відповідного лоадера (`ctx.loaders.film.load(id)`);
- лоадер збирає всі ідентифікатори, зібрані за один тік події, і робить **один**
  запит `find({ _id: { $in: ids } })` на колекцію;
- порядок результату вибудовується за порядком вхідних ідентифікаторів (контракт
  DataLoader), а відсутній документ стає помилкою саме для свого ключа.

Отже сторінка сеансів коштує рівно: один `find` на самі сеанси + один батч-запит
на колекцію `films` + один на `halls` — незалежно від кількості сеансів на
сторінці. Якщо клієнт не запитує вкладені `film`/`hall`, лоадери взагалі не
викликаються (резолвери полів не спрацьовують).

**Лоадери створюються на кожен запит** (у функції `context` модуля GraphQL), а не
один на застосунок: спільний лоадер кешував би документи між запитами різних
клієнтів, і зміна фільму не була б видна, доки процес не перезапустять.

> Альтернативний припустимий спосіб — `populate('film').populate('hall')` прямо в
> запиті списку. Його мінус — `populate` виконувався б завжди, навіть коли клієнт
> не питав поле `film`. Тому тут обрано DataLoader.

Батчинг перевіряється e2e-тестом (`test/graphql.e2e-spec.ts`, блок «N+1»): він
шпигує за `Model.find` колекцій `films`/`halls` і стверджує, що запит сторінки з
чотирьох сеансів викликає кожен з них рівно один раз.

---

## Бронювання (одним оновленням)

`createBooking` займає місця й записує бронювання **одним** `updateOne` документа
сеансу:

- умова оновлення вимагає, щоб **усі** потрібні місця були вільні
  (`$elemMatch … bookingId: null` для кожного місця);
- оновлення ставить `bookingId` на ці місця (`$set` з `arrayFilters`) і додає
  запис у `bookings` (`$push`) — атомарно, або нічого;
- результат перевіряється за `matchedCount`: `0` означає, що хоча б одне місце вже
  зайняте → `CONFLICT` (жодне місце зі списку не бронюється).

Перед оновленням (без звернення до бази на запис) перевіряються: непорожність і
відсутність дублікатів у списку місць, існування сеансу (`NOT_FOUND`) та межі
схеми залу. Формат ідентифікаторів перевіряється до звернення до бази.

---

## Обробка помилок

Помилки перетворюються на GraphQL-помилки з кодом у `extensions.code`
(`src/common/filters/graphql-exception.filter.ts`). Клієнт читає код з
`errors[0].extensions.code`:

| Випадок | Код |
| --- | --- |
| запит неіснуючого документа через `film`/`hall`/`showing` | — (повертає `null`, без помилки) |
| мутація над неіснуючим документом | `NOT_FOUND` |
| порушення валідації вхідних даних / некоректний формат id | `BAD_USER_INPUT` |
| зайняте місце, видалення з залежними сеансами, дублікат назви залу | `CONFLICT` |
| помилка бази даних | `INTERNAL_SERVER_ERROR` |

Текст помилки бази даних клієнту не показується: у розширеннях лишається
загальний код, деталі йдуть у логи сервера.

---

## Команди

```bash
npm run start:dev    # запуск у режимі розробки (watch)
npm run start        # звичайний запуск
npm run build        # збірка
npm run seed         # засівання бази тестовими даними (ідемпотентне)
npm run lint         # eslint
npm run format       # prettier --write
npm test             # модульні тести
npm run test:e2e     # e2e-тести (потрібна запущена MongoDB)
```

Набір засівання: 2 фільми, 2 зали, 4 сеанси в різні дати й 1 бронювання.
Повторний запуск `npm run seed` не створює дублікатів.

---

## Структура

```
src/
├── app.module.ts            # ConfigModule, MongooseModule, GraphQLModule (Apollo, code-first)
├── app.setup.ts             # глобальний ValidationPipe
├── main.ts                  # bootstrap
├── schema.gql               # згенерована схема (code-first), у репозиторії
├── seed.ts                  # засівання бази
├── common/
│   ├── filters/             # GraphQL-фільтр помилок (коди в extensions)
│   ├── loaders/             # DataLoader-и film/hall + контекст запиту
│   ├── pipes/               # ParseObjectIdPipe (перевірка формату id до бази)
│   └── validators/…         # власні валідатори (дата, optional-if-present)
├── films/     # @ObjectType Film, CreateFilmInput/UpdateFilmInput, резолвер, сервіс, схема
├── halls/     # @ObjectType Hall, CreateHallInput, резолвер, сервіс, схема
├── showings/  # Showing/Seat/BookedSeat/Booking/ShowingPage, ShowingsArgs(@ArgsType), резолвер (ResolveField film/hall), сервіс
└── bookings/  # резолвер і сервіс бронювань (працюють з документом Showing)
```
