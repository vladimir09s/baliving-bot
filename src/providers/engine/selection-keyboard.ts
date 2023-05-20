export class SelectionKeyboard {
    static CHOSE = '✅'

    static proccess(keyboard, clickedText, data, size = 2) {
        let keyboard1d = this.convertToOneDimension(keyboard).slice(
            0,
            data.length
        )
        let anySelected = false
        keyboard1d.forEach((keyboardItem, index, arr) => {
            if (this.isEqual(keyboardItem, clickedText)) {
                if (this.isSelected(keyboardItem)) {
                    arr[index] = this.unselect(keyboardItem)
                } else {
                    arr[index] = this.select(keyboardItem)
                }
            }
            if (this.isSelected(arr[index])) {
                anySelected = true
            }
        })

        let keyboardReshaped = this.sliceIntoChunks(keyboard1d, size)

        return [keyboardReshaped, anySelected] as const;
    }

    static sliceIntoChunks(array, size) {
        const result = []
        for (let i = 0; i < array.length; i += size) {
            const chunk = array.slice(i, i + size)
            result.push(chunk)
        }
        return result
    }

    static convertToOneDimension(keyboard) {
        const keyboardItems = []
        keyboard.forEach((subKeyboard) => {
            subKeyboard.forEach((subKeyboardItem) => {
                keyboardItems.push(subKeyboardItem)
            })
        })
        return keyboardItems
    }

    static isEqual(keyboardItem, clickedText) {
        return keyboardItem.text.includes(clickedText)
    }

    static isSelected(keyboardItem) {
        return keyboardItem.text.includes(SelectionKeyboard.CHOSE)
    }

    static select(keyboardItem) {
        return {
            text: `${SelectionKeyboard.CHOSE} ${keyboardItem.text}`,
            callback_data: keyboardItem.callback_data,
        }
    }

    static unselect(keyboardItem) {
        return {
            text: keyboardItem.text.substring(2),
            callback_data: keyboardItem.callback_data,
        }
    }
}
