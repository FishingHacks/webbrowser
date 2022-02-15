import os
os.system("cls")
while True:
    try:
        ui = input(os.getcwd() + "$ ")
        if(ui != None) & (ui != ""):
            if(ui.startswith("exit") | ui.startswith("quit")):
                os.system("cls")
                break
            if(ui.startswith("cd ")):
                if(len(ui) > 3):
                    try:
                        ui = ui.replace("cd ", "", 1)
                        os.chdir(ui)
                        pass
                    except Exception as e:
                        print(e)
                        pass
                else:
                    print("No Path specified")
                    pass
            if(ui.startswith("Set-Location ")):
                if(len(ui) > 13):
                    try:
                        ui = ui.replace("Set-Location ", "", 1)
                        os.chdir(ui)
                        pass
                    except Exception as e:
                        print(e)
                        pass
                else:
                    print("No Path specified")
                    pass
            if not ui.startswith("cd"):
                print(os.system(ui))
        else:
            pass
    except BaseException as e:
        print(e)
