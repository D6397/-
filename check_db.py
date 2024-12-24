import sqlite3

def check_db():
    try:
        with sqlite3.connect('app.db') as conn:
            cursor = conn.cursor()
            
            # 获取所有表
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            
            print("数据库表:")
            for table in tables:
                print(f"\n表名: {table[0]}")
                cursor.execute(f"PRAGMA table_info({table[0]});")
                columns = cursor.fetchall()
                print("列信息:")
                for col in columns:
                    print(f"  - {col[1]} ({col[2]})")
                    
            # 检查每个表的记录数
            print("\n表记录数:")
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table[0]};")
                count = cursor.fetchone()[0]
                print(f"  - {table[0]}: {count} 条记录")
                
    except Exception as e:
        print(f"检查数据库时出错: {str(e)}")

if __name__ == '__main__':
    check_db() 